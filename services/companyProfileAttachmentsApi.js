import tenantApiService from "@/API/TenantApiService";
import {
  fetchAttachmentBlob,
  openAttachmentViewInNewTab,
} from "@/services/attachmentBlob";

/**
 * Company profile attachments (logo) — paths have no record id segment.
 * Aligns with company-profile/attachments* tenant routes.
 */

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchCompanyProfileAttachments() {
  const data = await tenantApiService("GET", "company-profile/attachments");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {File | Blob} file
 * @param {import("axios").AxiosRequestConfig} [config]
 * @returns {Promise<unknown>}
 */
export function uploadCompanyProfileAttachment(file, config = {}) {
  const fd = new FormData();
  fd.append("file", file);
  return tenantApiService("POST", "company-profile/attachments", fd, config);
}

/**
 * @param {number | string} attachmentId
 * @returns {Promise<unknown>}
 */
export function deleteCompanyProfileAttachment(attachmentId) {
  return tenantApiService(
    "DELETE",
    `company-profile/attachments/${attachmentId}`,
  );
}

/**
 * @param {number | string} attachmentId
 * @returns {Promise<Blob>}
 */
export function downloadCompanyProfileAttachmentBlob(attachmentId) {
  return fetchAttachmentBlob(
    `company-profile/attachments/${attachmentId}`,
    "download",
  );
}

/**
 * @param {number | string} attachmentId
 * @returns {Promise<Blob>}
 */
export function viewCompanyProfileAttachmentBlob(attachmentId) {
  return fetchAttachmentBlob(
    `company-profile/attachments/${attachmentId}`,
    "view",
  );
}

/**
 * @param {number | string} attachmentId
 * @param {string} [mimeType]
 * @returns {Promise<void>}
 */
export function openCompanyProfileAttachmentView(attachmentId, mimeType) {
  return openAttachmentViewInNewTab(
    `company-profile/attachments/${attachmentId}`,
    mimeType,
  );
}
