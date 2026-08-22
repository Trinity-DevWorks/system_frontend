import { tenantRequest } from "@/lib/axios";
import { createAttachmentBlobApi } from "@/lib/attachments/attachmentBlob";

const blobApi = createAttachmentBlobApi("salesmen");

/**
 * @param {number | string} salesmanId
 * @returns {Promise<unknown[]>}
 */
export async function fetchSalesmanAttachments(salesmanId) {
  const data = await tenantRequest("GET", `salesmen/${salesmanId}/attachments`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} salesmanId
 * @param {File | Blob} file
 * @returns {Promise<unknown>}
 */
export function uploadSalesmanAttachment(salesmanId, file, config = {}) {
  const fd = new FormData();
  fd.append("file", file);
  return tenantRequest("POST", `salesmen/${salesmanId}/attachments`, fd, config);
}

/**
 * @param {number | string} salesmanId
 * @param {number | string} attachmentId
 * @returns {Promise<unknown>}
 */
export function deleteSalesmanAttachment(salesmanId, attachmentId) {
  return tenantRequest("DELETE", `salesmen/${salesmanId}/attachments/${attachmentId}`);
}

export const salesmenAttachmentsApi = {
  fetchList: fetchSalesmanAttachments,
  upload: uploadSalesmanAttachment,
  remove: deleteSalesmanAttachment,
  downloadBlob: blobApi.downloadBlob,
  viewBlob: blobApi.viewBlob,
  openViewInNewTab: blobApi.openViewInNewTab,
};
