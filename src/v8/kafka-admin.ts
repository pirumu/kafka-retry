import { Admin } from '@nestjs/microservices/external/kafka.interface';
import { AUTO_CREATE_RETRY_TOPIC, RetryTopicConstants } from './constants';
import { IRetryMetadata } from './interfaces';
import {
  getDeadTopicName,
  getPatternRetryTopic,
  getRetryTopicName,
} from './utils';

export class KafkaAdmin {
  constructor(protected readonly admin: Admin) {}

  public async createRetryTopics(
    pattern: string,
    retryableTopic: IRetryMetadata,
  ) {
    const currentTopics = await this.admin.listTopics();
    const currentRetryTopics = currentTopics.filter((topic) => {
      return new RegExp(getPatternRetryTopic(pattern)).test(topic);
    });
    const topics = [];
    const result = [];
    /*
     * Retry topics
     */
    for (let index = 1; index <= retryableTopic.attempts; index++) {
      const retryTopicName = getRetryTopicName(pattern, index);
      result.push(retryTopicName);
      if (
        index <= RetryTopicConstants.MAX_ATTEMPTS &&
        !currentRetryTopics.includes(retryTopicName)
      ) {
        topics.push(retryTopicName);
      }
    }
    /*
     * Dead letter topic
     */
    const deadTopicName = getDeadTopicName(pattern);
    if (!currentTopics.includes(deadTopicName)) {
      topics.push(deadTopicName);
    }

    const autoCreateRetryTopic =
      retryableTopic.autoCreateRetryTopic ?? AUTO_CREATE_RETRY_TOPIC;
    if (autoCreateRetryTopic) {
      await this.admin.createTopics({
        topics: topics.map((topic) => ({
          topic: topic,
          numPartitions: RetryTopicConstants.DEFAULT_PARTITIONS,
          replicationFactor: RetryTopicConstants.REPLICATION_FACTOR,
        })),
      });
    }
    return result;
  }
}
