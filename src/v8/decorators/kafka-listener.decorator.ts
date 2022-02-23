import { IRetryMetadata } from '../interfaces';
import { EventPattern, Transport } from '@nestjs/microservices';

export const KafkaListener = (
  topic: string,
  retryableTopic?: { retry?: IRetryMetadata }
) => {
  return EventPattern(topic, Transport.KAFKA, retryableTopic);
};
