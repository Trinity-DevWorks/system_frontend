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
  blobUrlCache.set(mediaPreviewCacheKey(recordId, attachmentId), blobUrl);
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
