import tenantApiService from "@/API/TenantApiService";
import { tenantApiClient } from "@/lib/axios";

/**
 * @param {number | string} salesmanId
 * @returns {Promise<unknown[]>}
 */
export async function fetchSalesmanAttachments(salesmanId) {
  const data = await tenantApiService("GET", `salesmen/${salesmanId}/attachments`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} salesmanId
 * @param {File | Blob} file
 * @returns {Promise<unknown>}
 */
export function uploadSalesmanAttachment(salesmanId, file) {
  const fd = new FormData();
  fd.append("file", file);
  return tenantApiService("POST", `salesmen/${salesmanId}/attachments`, fd);
}

/**
 * @param {number | string} salesmanId
 * @param {number | string} attachmentId
 * @returns {Promise<unknown>}
 */
export function deleteSalesmanAttachment(salesmanId, attachmentId) {
  return tenantApiService("DELETE", `salesmen/${salesmanId}/attachments/${attachmentId}`);
}

/**
 * @param {number | string} salesmanId
 * @param {number | string} attachmentId
 * @returns {Promise<Blob>}
 */
export async function fetchSalesmanAttachmentBlob(salesmanId, attachmentId) {
  const res = await tenantApiClient.get(`salesmen/${salesmanId}/attachments/${attachmentId}/download`, {
    responseType: "blob",
    timeout: 120_000,
  });
  return res.data;
}

/** Stable API bundle for resource attachment drawers. */
export const salesmenAttachmentsApi = {
  fetchList: fetchSalesmanAttachments,
  upload: uploadSalesmanAttachment,
  remove: deleteSalesmanAttachment,
  downloadBlob: fetchSalesmanAttachmentBlob,
};
