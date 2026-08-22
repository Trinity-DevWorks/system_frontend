/** @type {Map<string, string>} */
const blobUrlCache = new Map();

/**
 * @param {number | string} recordId
 * @param {number | string} attachmentId
 */
export function mediaPreviewCacheKey(recordId, attachmentId) {
  return `${recordId}:${attachmentId}`;
}

/**
 * @param {number | string} recordId
 * @param {number | string} attachmentId
 * @returns {string | null}
 */
export function getCachedMediaBlobUrl(recordId, attachmentId) {
  return blobUrlCache.get(mediaPreviewCacheKey(recordId, attachmentId)) ?? null;
}

/**
 * @param {number | string} recordId
 * @param {number | string} attachmentId
 * @param {string} blobUrl
 */
export function setCachedMediaBlobUrl(recordId, attachmentId, blobUrl) {
  const key = mediaPreviewCacheKey(recordId, attachmentId);
  const previous = blobUrlCache.get(key);
  if (previous && previous !== blobUrl) {
    URL.revokeObjectURL(previous);
  }
  blobUrlCache.set(key, blobUrl);
}

/**
 * @param {number | string} recordId
 */
export function invalidateMediaPreviewCacheForRecord(recordId) {
  const prefix = `${recordId}:`;
  for (const [key, url] of blobUrlCache.entries()) {
    if (key.startsWith(prefix)) {
      URL.revokeObjectURL(url);
      blobUrlCache.delete(key);
    }
  }
}

/** Revoke every object URL. Call on auth change so a soft logout cannot reuse blobs. */
export function clearMediaPreviewCache() {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();
}

