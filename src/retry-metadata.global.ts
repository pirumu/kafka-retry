export function getRetryMetadata(): Map<string, Record<string, any>> {
  if (!global.retryMetadata) {
    global.retryMetadatas = new Map<string, Record<string, any>>();
  }
  return global.retryMetadata;
}

export function setRetryMetadata(key: string, value: Record<string, any>) {
  getRetryMetadata().set(key, value);
}

export function getRetryMetadataByKey(key: string): Record<string, any> {
  return getRetryMetadata().get(key);
}
