import tenantApiService from "@/API/TenantApiService";
import { createAttachmentBlobApi } from "@/services/attachmentBlob";

const blobApi = createAttachmentBlobApi("suppliers");

/**
 * @param {number | string} supplierId
 * @returns {Promise<unknown[]>}
 */
export async function fetchSupplierAttachments(supplierId) {
  const data = await tenantApiService("GET", `suppliers/${supplierId}/attachments`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} supplierId
 * @param {File | Blob} file
 * @returns {Promise<unknown>}
 */
export function uploadSupplierAttachment(supplierId, file, config = {}) {
  const fd = new FormData();
  fd.append("file", file);
  return tenantApiService("POST", `suppliers/${supplierId}/attachments`, fd, config);
}

/**
 * @param {number | string} supplierId
 * @param {number | string} attachmentId
 * @returns {Promise<unknown>}
 */
export function deleteSupplierAttachment(supplierId, attachmentId) {
  return tenantApiService("DELETE", `suppliers/${supplierId}/attachments/${attachmentId}`);
}

export const suppliersAttachmentsApi = {
  fetchList: fetchSupplierAttachments,
  upload: uploadSupplierAttachment,
  remove: deleteSupplierAttachment,
  downloadBlob: blobApi.downloadBlob,
  viewBlob: blobApi.viewBlob,
  openViewInNewTab: blobApi.openViewInNewTab,
};
