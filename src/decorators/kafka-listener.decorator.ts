import { IRetryMetadata } from '../interfaces';
import { EventPattern, Transport } from '@nestjs/microservices';
import { isGTEV8_3_1 } from '../version';
import { setRetryMetadata } from '../retry-metadata.global';

export const KafkaListener = (
  topic: string,
  retryableTopic?: { retry?: IRetryMetadata }
) => {

  if(isGTEV8_3_1()) {
   return EventPattern(topic, Transport.KAFKA, retryableTopic);
  }
  setRetryMetadata(topic,retryableTopic);
  return EventPattern(topic, Transport.KAFKA);
};
