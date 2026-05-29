/**
 * Client-side viewer category guess (matches backend classifier roughly).
 * @param {File} file
 */
export function guessViewerCategoryFromFile(file) {
  const mime = file.type || "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml"
  ) {
    return "text";
  }
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("presentation") ||
    mime.includes("powerpoint")
  ) {
    return "document";
  }
  return "other";
}

/**
 * @param {File} file
 * @returns {string | undefined}
 */
export function createFilePreviewUrl(file) {
  if (!file.type.startsWith("image/")) return undefined;
  return URL.createObjectURL(file);
}

/**
 * @param {string | undefined} url
 */
export function revokeFilePreviewUrl(url) {
  if (url) URL.revokeObjectURL(url);
}
