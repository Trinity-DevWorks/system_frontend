import tenantApiService from "@/API/TenantApiService";
import { createAttachmentBlobApi } from "@/services/attachmentBlob";

const blobApi = createAttachmentBlobApi("customers");

/**
 * @param {number | string} customerId
 * @returns {Promise<unknown[]>}
 */
export async function fetchCustomerAttachments(customerId) {
  const data = await tenantApiService("GET", `customers/${customerId}/attachments`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} customerId
 * @param {File | Blob} file
 * @returns {Promise<unknown>}
 */
export function uploadCustomerAttachment(customerId, file, config = {}) {
  const fd = new FormData();
  fd.append("file", file);
  return tenantApiService("POST", `customers/${customerId}/attachments`, fd, config);
}

/**
 * @param {number | string} customerId
 * @param {number | string} attachmentId
 * @returns {Promise<unknown>}
 */
export function deleteCustomerAttachment(customerId, attachmentId) {
  return tenantApiService("DELETE", `customers/${customerId}/attachments/${attachmentId}`);
}

export const customersAttachmentsApi = {
  fetchList: fetchCustomerAttachments,
  upload: uploadCustomerAttachment,
  remove: deleteCustomerAttachment,
  downloadBlob: blobApi.downloadBlob,
  viewBlob: blobApi.viewBlob,
  openViewInNewTab: blobApi.openViewInNewTab,
};
