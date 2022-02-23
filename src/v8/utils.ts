import { TopicSuffixingStrategy } from './constants';

export const getRetryTopicName = (topicName: any, index: any) =>
  `${topicName}${TopicSuffixingStrategy.RETRY_SUFFIX}-${index}`;

export const getDeadTopicName = (topicName: any) =>
  `${topicName}${TopicSuffixingStrategy.DLT_SUFFIX}`;

export const getPatternRetryTopic = (topicName: any) =>
  `${topicName}${TopicSuffixingStrategy.RETRY_SUFFIX}-[1-9]`;
