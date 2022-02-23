import { EventPattern, Transport } from '@nestjs/microservices';
import { getDeadTopicName } from '../utils';

export const KafkaDtl = (topic: string) => {
  const deadTopicName = getDeadTopicName(topic);
  return EventPattern(deadTopicName, Transport.KAFKA);
};
