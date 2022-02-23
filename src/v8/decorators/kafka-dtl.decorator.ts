import { EventPattern } from '@nestjs/microservices';
import { getDeadTopicName } from '../utils';

export const KafkaDtl = (topic: string) => {
  const deadTopicName = getDeadTopicName(topic);
  return EventPattern(deadTopicName);
};