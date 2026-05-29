import tenantApiService from "@/API/TenantApiService";
import { createAttachmentBlobApi } from "@/services/attachmentBlob";

const blobApi = createAttachmentBlobApi("items");

/**
 * @param {number | string} itemId
 * @returns {Promise<unknown[]>}
 */
export async function fetchItemAttachments(itemId) {
  const data = await tenantApiService("GET", `items/${itemId}/attachments`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} itemId
 * @param {File | Blob} file
 * @returns {Promise<unknown>}
 */
export function uploadItemAttachment(itemId, file, config = {}) {
  const fd = new FormData();
  fd.append("file", file);
  return tenantApiService("POST", `items/${itemId}/attachments`, fd, config);
}

/**
 * @param {number | string} itemId
 * @param {number | string} attachmentId
 * @returns {Promise<unknown>}
 */
export function deleteItemAttachment(itemId, attachmentId) {
  return tenantApiService("DELETE", `items/${itemId}/attachments/${attachmentId}`);
}

/**
 * @param {number | string} itemId
 * @param {number | string} attachmentId
 * @returns {Promise<unknown>}
 */
export function setItemAttachmentPrimary(itemId, attachmentId) {
  return tenantApiService("PUT", `items/${itemId}/attachments/${attachmentId}/primary`);
}

export const itemsAttachmentsApi = {
  fetchList: fetchItemAttachments,
  upload: uploadItemAttachment,
  remove: deleteItemAttachment,
  downloadBlob: blobApi.downloadBlob,
  viewBlob: blobApi.viewBlob,
  openViewInNewTab: blobApi.openViewInNewTab,
  setPrimary: setItemAttachmentPrimary,
};
