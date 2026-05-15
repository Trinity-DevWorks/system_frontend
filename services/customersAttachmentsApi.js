import tenantApiService from "@/API/TenantApiService";
import { tenantApiClient } from "@/lib/axios";

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
export function uploadCustomerAttachment(customerId, file) {
  const fd = new FormData();
  fd.append("file", file);
  return tenantApiService("POST", `customers/${customerId}/attachments`, fd);
}

/**
 * @param {number | string} customerId
 * @param {number | string} attachmentId
 * @returns {Promise<unknown>}
 */
export function deleteCustomerAttachment(customerId, attachmentId) {
  return tenantApiService("DELETE", `customers/${customerId}/attachments/${attachmentId}`);
}

/**
 * @param {number | string} customerId
 * @param {number | string} attachmentId
 * @returns {Promise<Blob>}
 */
export async function fetchCustomerAttachmentBlob(customerId, attachmentId) {
  const res = await tenantApiClient.get(`customers/${customerId}/attachments/${attachmentId}/download`, {
    responseType: "blob",
    timeout: 120_000,
  });
  return res.data;
}

export const customersAttachmentsApi = {
  fetchList: fetchCustomerAttachments,
  upload: uploadCustomerAttachment,
  remove: deleteCustomerAttachment,
  downloadBlob: fetchCustomerAttachmentBlob,
};
