import { centralRequest } from "@/lib/axios";

/** @returns {Promise<Record<string, unknown>>} */
export function fetchPlatformProfile() {
  return centralRequest("GET", "platform-profile");
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Promise<Record<string, unknown>>}
 */
export function updatePlatformProfile(payload) {
  return centralRequest("PUT", "platform-profile", payload);
}

/**
 * @param {File | Blob} file png, jpg, or webp up to 2 MB
 * @returns {Promise<Record<string, unknown>>} updated platform profile
 */
export function uploadPlatformLogo(file) {
  const fd = new FormData();
  fd.append("file", file);
  return centralRequest("POST", "platform-profile/logo", fd);
}

/** @returns {Promise<Record<string, unknown>>} updated platform profile */
export function deletePlatformLogo() {
  return centralRequest("DELETE", "platform-profile/logo");
}

/** @returns {Promise<Record<string, unknown>>} */
export function fetchPlatformSettings() {
  return centralRequest("GET", "platform-settings");
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Promise<Record<string, unknown>>}
 */
export function updatePlatformSettings(payload) {
  return centralRequest("PUT", "platform-settings", payload);
}
