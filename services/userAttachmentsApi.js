import tenantApiService from "@/API/TenantApiService";
import { fetchAttachmentBlob } from "@/services/attachmentBlob";

/**
 * User avatar attachments — nested under `users/{userId}/attachments*`.
 */

/**
 * @param {string} userId
 * @param {File | Blob} file
 * @param {import("axios").AxiosRequestConfig} [config]
 */
export function uploadUserAttachment(userId, file, config = {}) {
  const fd = new FormData();
  fd.append("file", file);
  return tenantApiService("POST", `users/${userId}/attachments`, fd, config);
}

/**
 * @param {string} userId
 * @param {number | string} attachmentId
 */
export function deleteUserAttachment(userId, attachmentId) {
  return tenantApiService(
    "DELETE",
    `users/${userId}/attachments/${attachmentId}`,
  );
}

/**
 * @param {string} userId
 * @param {number | string} attachmentId
 */
export function setUserAttachmentPrimary(userId, attachmentId) {
  return tenantApiService(
    "PUT",
    `users/${userId}/attachments/${attachmentId}/primary`,
  );
}

/**
 * @param {string} userId
 * @param {number | string} attachmentId
 * @returns {Promise<Blob>}
 */
export function viewUserAttachmentBlob(userId, attachmentId) {
  return fetchAttachmentBlob(
    `users/${userId}/attachments/${attachmentId}`,
    "view",
  );
}

/**
 * @param {string | null | undefined} attachmentId
 * @returns {unknown[]}
 */
export function userAvatarPreviewQueryKey(attachmentId) {
  return ["user-avatar-preview", attachmentId ?? null];
}
