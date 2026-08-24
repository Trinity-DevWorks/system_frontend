/**
 * @param {number} bytes
 */
export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Image and audio use in-app preview; everything else opens in a new browser tab.
 * @param {{ viewer_category?: string }} attachment
 */
export function usesCustomMediaPreview(attachment) {
  const cat = attachment.viewer_category ?? "";
  return cat === "image" || cat === "audio";
}
