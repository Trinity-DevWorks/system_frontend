import tenantApiService from "@/API/TenantApiService";
import { tenantApiClient } from "@/lib/axios";

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
export function uploadSupplierAttachment(supplierId, file) {
  const fd = new FormData();
  fd.append("file", file);
  return tenantApiService("POST", `suppliers/${supplierId}/attachments`, fd);
}

/**
 * @param {number | string} supplierId
 * @param {number | string} attachmentId
 * @returns {Promise<unknown>}
 */
export function deleteSupplierAttachment(supplierId, attachmentId) {
  return tenantApiService("DELETE", `suppliers/${supplierId}/attachments/${attachmentId}`);
}

/**
 * @param {number | string} supplierId
 * @param {number | string} attachmentId
 * @returns {Promise<Blob>}
 */
export async function fetchSupplierAttachmentBlob(supplierId, attachmentId) {
  const res = await tenantApiClient.get(`suppliers/${supplierId}/attachments/${attachmentId}/download`, {
    responseType: "blob",
    timeout: 120_000,
  });
  return res.data;
}

export const suppliersAttachmentsApi = {
  fetchList: fetchSupplierAttachments,
  upload: uploadSupplierAttachment,
  remove: deleteSupplierAttachment,
  downloadBlob: fetchSupplierAttachmentBlob,
};
