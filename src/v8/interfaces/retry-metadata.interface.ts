export type Backoff = {
  delay?: number;
  multiplier?: number;
};

export interface IRetryMetadata {
  attempts: number;
  backoff?: Backoff;
  autoCreateRetryTopic?: boolean;
}
