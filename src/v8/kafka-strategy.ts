import {
  CustomTransportStrategy,
  KafkaContext,
  KafkaHeaders,
  KafkaOptions,
  ReadPacket,
  ServerKafka,
} from '@nestjs/microservices';
import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';
import {
  Consumer,
  EachMessagePayload,
  IHeaders,
} from '@nestjs/microservices/external/kafka.interface';
import { connectable, isObservable, Subject } from 'rxjs';
import {
  KAFKA_DEFAULT_DELAY,
  KAFKA_DEFAULT_MULTIPLIER,
  NO_EVENT_HANDLER,
  NO_MESSAGE_HANDLER,
  TopicSuffixingStrategy,
} from './constants';
import { KafkaAdmin } from './kafka-admin';
import { getDeadTopicName, getRetryTopicName } from './utils';

export class KafkaStrategy
  extends ServerKafka
  implements CustomTransportStrategy
{
  constructor(protected readonly options: KafkaOptions['options']) {
    super(options);
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ): Promise<void> {
    this.client = this.createClient();
    await this.start(callback);
  }

  public async start(callback: () => void): Promise<void> {
    const consumerOptions = Object.assign(this.options.consumer || {}, {
      groupId: this.groupId,
    });
    this.consumer = this.client.consumer(consumerOptions);
    this.producer = this.client.producer(this.options.producer);

    await this.consumer.connect();
    await this.producer.connect();
    await this.bindRetryEvents(this.consumer);
    await this.bindEvents(this.consumer);
    callback();
  }

  public async bindEvents(consumer: Consumer) {
    const registeredPatterns = [...this.messageHandlers.keys()];
    const consumerSubscribeOptions = this.options.subscribe || {};
    const subscribeToPattern = async (pattern: string) =>
      consumer.subscribe({
        topic: pattern,
        ...consumerSubscribeOptions,
      });
    await Promise.all(registeredPatterns.map(subscribeToPattern));

    const consumerRunOptions = Object.assign(this.options.run || {}, {
      autoCommit: false,
      eachMessage: async (payload) => {
        const { rawMessage, isRetry } = this.parseRawMessage(payload);
        const { topic, partition } = rawMessage;
        const offset = parseInt(rawMessage.offset) + 1;
        if (isRetry) {
          const remainingTime = this.getRemainingTimeToProcess(rawMessage);
          if (remainingTime > 0) {
            this.consumer.pause([{ topic, partitions: [partition] }]);
            setTimeout(() => {
              this.consumer.resume([{ topic, partitions: [partition] }]);
            }, remainingTime);
            setTimeout(async () => {
              await this.handleMessage(rawMessage);
              this.consumer.commitOffsets([
                { topic: topic, partition, offset: `${offset}` },
              ]);
            }, remainingTime);

            return;
          }
        }
        await this.handleMessage(rawMessage);
        this.consumer.commitOffsets([
          { topic: topic, partition, offset: `${offset}` },
        ]);
      },
    });
    await consumer.run(consumerRunOptions);
  }

  public getRemainingTimeToProcess(rawMessage) {
    const { timestamp, headers } = rawMessage;
    const delay = headers.delay;
    const remainingTime = parseInt(timestamp) + parseInt(delay) - +new Date();
    return remainingTime;
  }

  parseRawMessage(payload: EachMessagePayload) {
    const rawMessage = this.parser.parse(
      Object.assign(payload.message, {
        topic: payload.topic,
        partition: payload.partition,
      }),
    );

    const isRetry =
      rawMessage.headers.tried &&
      rawMessage.headers.delay &&
      !rawMessage.headers.isCompleted;

    return { isRetry, rawMessage };
  }
  public async handleMessage(rawMessage) {
    const { topic, partition, headers } = rawMessage;
    console.log(
      `**** Handle message - Topic: ${topic} - Partition: ${partition} ***** ${new Date().toLocaleString()} `,
    );
    console.log(rawMessage.value);
    const correlationId = headers[KafkaHeaders.CORRELATION_ID];
    const replyTopic = headers[KafkaHeaders.REPLY_TOPIC];
    const replyPartition = headers[KafkaHeaders.REPLY_PARTITION];

    const packet = await this.deserializer.deserialize(rawMessage, {
      channel: topic,
    });
    const kafkaContext = new KafkaContext([rawMessage, partition, topic]);
    // if the correlation id or reply topic is not set
    // then this is an event (events could still have correlation id)
    if (!correlationId || !replyTopic) {
      return this.handleEvent(packet.pattern, packet, kafkaContext);
    }

    const publish = this.getPublisher(
      replyTopic,
      replyPartition,
      correlationId,
    );
    const handler = this.getHandlerByPattern(packet.pattern);
    if (!handler) {
      return publish({
        id: correlationId,
        err: NO_MESSAGE_HANDLER,
      });
    }

    const response$ = this.transformToObservable(
      await handler(packet.data, kafkaContext),
    );
    response$ && this.send(response$, publish);
  }

  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: BaseRpcContext,
  ): Promise<any> {
    const posRetryChar = pattern.indexOf(TopicSuffixingStrategy.RETRY_SUFFIX);
    if (posRetryChar !== -1) {
      pattern = pattern.substring(0, posRetryChar);
    }

    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(
        `${NO_EVENT_HANDLER} Event pattern: ${JSON.stringify(pattern)}.`,
      );
    }

    try {
      const resultOrStream = await handler(packet.data, context);

      if (isObservable(resultOrStream)) {
        resultOrStream.subscribe({
          error: (error) => {
            console.log(error);
            const headers: IHeaders = packet.data.headers;
            const payload = packet.data.value;
            if (!headers?.isCompleted) {
              this.handleRetry(pattern, headers, payload);
            }
          },
        });
        const connectableSource = connectable(resultOrStream, {
          connector: () => new Subject(),
          resetOnDisconnect: false,
        });
        connectableSource.connect();
      }
    } catch (error) {
      console.log('handle error', error);
    }
  }

  handleRetry(pattern: string, headers: IHeaders, payload) {
    const handlerPattern = this.getHandlers().get(pattern);
    const retry = handlerPattern.extras.retry || null;
    if (!retry || retry?.attempts === 0) return;

    const initialDelay = retry.backoff?.delay || KAFKA_DEFAULT_DELAY;
    let multiplier = 1;
    if (parseInt(headers?.tried as string) >= 1) {
      multiplier = retry?.backoff?.multiplier || KAFKA_DEFAULT_MULTIPLIER;
    }

    let nextTopic: string;
    if (headers?.tried >= retry.attempts) {
      headers.isCompleted = '1';
      nextTopic = getDeadTopicName(pattern);
    } else {
      const tried: string = (headers?.tried as string) ?? '0';
      const delay: string = (headers?.delay as string) ?? `${initialDelay}`;
      headers = {
        tried: `${parseInt(tried) + 1}`,
        delay: `${parseInt(delay) * multiplier}`,
      };
      nextTopic = getRetryTopicName(pattern, headers.tried);
    }
    this.producer.send({
      topic: nextTopic,
      messages: [
        {
          value: JSON.stringify(payload),
          headers,
        },
      ],
    });
  }

  public async bindRetryEvents(consumer: Consumer) {
    const kafkaAdmin = new KafkaAdmin(this.client.admin());
    const handler = this.getHandlers();
    for (const [key, value] of handler.entries()) {
      if (value.extras.retry && value.extras.retry.attempts > 0) {
        const retryTopics = await kafkaAdmin.createRetryTopics(
          key,
          value.extras.retry,
        );
        const subscribeToPattern = async (pattern: string) => {
          return consumer.subscribe({
            topic: pattern,
          });
        };
        await Promise.all(retryTopics.map(subscribeToPattern));
      }
    }
  }

  public async close(): Promise<void> {
    this.consumer && (await this.consumer.disconnect());
    this.producer && (await this.producer.disconnect());
    this.consumer = null;
    this.producer = null;
    this.client = null;
  }
}
