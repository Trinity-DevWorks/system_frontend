import { tenantApiClient } from "@/lib/axios";

/**
 * @param {string} resourcePath e.g. `customers/12/attachments/5`
 * @param {'download' | 'view'} mode
 * @returns {Promise<Blob>}
 */
export async function fetchAttachmentBlob(resourcePath, mode = "download") {
  const suffix = mode === "view" ? "view" : "download";
  const res = await tenantApiClient.get(`${resourcePath}/${suffix}`, {
    responseType: "blob",
    timeout: 120_000,
  });
  return res.data;
}

/**
 * Fetch with auth, then open in a new tab so the browser renders PDF/images/video/etc.
 * @param {string} resourcePath
 * @param {string} [mimeType]
 */
export async function openAttachmentViewInNewTab(resourcePath, mimeType) {
  const blob = await fetchAttachmentBlob(resourcePath, "view");
  const type = mimeType || blob.type || "application/octet-stream";
  const url = URL.createObjectURL(blob.type === type ? blob : new Blob([await blob.arrayBuffer()], { type }));

  // Do not use window.open + noopener: it returns null even when the tab opens successfully.
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * @param {string} basePath e.g. `customers`
 */
export function createAttachmentBlobApi(basePath) {
  const pathFor = (recordId, attachmentId) => `${basePath}/${recordId}/attachments/${attachmentId}`;

  return {
    downloadBlob: (recordId, attachmentId) => fetchAttachmentBlob(pathFor(recordId, attachmentId), "download"),
    viewBlob: (recordId, attachmentId) => fetchAttachmentBlob(pathFor(recordId, attachmentId), "view"),
    openViewInNewTab: (recordId, attachmentId, mimeType) =>
      openAttachmentViewInNewTab(pathFor(recordId, attachmentId), mimeType),
  };
}
