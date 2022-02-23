export const KAFKA_DEFAULT_CLIENT = 'nestjs-consumer';
export const KAFKA_DEFAULT_GROUP = 'nestjs-group';
export const NO_MESSAGE_HANDLER = `There is no matching message handler defined in the remote service.`;
export const KAFKA_DEFAULT_BROKER = 'localhost:9092';

export const NO_EVENT_HANDLER =
  'There is no matching event handler defined in the remote service.';
export enum TopicSuffixingStrategy {
  RETRY_SUFFIX = '-retry',
  DLT_SUFFIX = '-dlt',
}

export enum RetryTopicConstants {
  DEFAULT_PARTITIONS = 1,
  MAX_ATTEMPTS = 9,
  REPLICATION_FACTOR = 3,
}
export const KAFKA_DEFAULT_DELAY = 10000; // milisecond
export const KAFKA_DEFAULT_MULTIPLIER = 2;
export const ERROR_RETRY_MESSAGE = 'ERROR_RETRY_MESSAGE';
export const AUTO_CREATE_RETRY_TOPIC = true;
