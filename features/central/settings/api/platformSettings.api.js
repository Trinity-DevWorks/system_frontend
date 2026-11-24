import { centralRequest } from "@/lib/axios";

/** @returns {Promise<Record<string, unknown>>} `{ name, has_logo, logo_version }` */
export function fetchPlatformSettings() {
  return centralRequest("GET", "platform-settings");
}

/**
 * @param {{ name: string }} payload
 * @returns {Promise<Record<string, unknown>>}
 */
export function updatePlatformSettings(payload) {
  return centralRequest("PUT", "platform-settings", payload);
}

/**
 * @param {File | Blob} file png, jpg, or webp up to 2 MB
 * @returns {Promise<Record<string, unknown>>} updated platform settings
 */
export function uploadPlatformLogo(file) {
  const fd = new FormData();
  fd.append("file", file);
  return centralRequest("POST", "platform-settings/logo", fd);
}

/** @returns {Promise<Record<string, unknown>>} updated platform settings */
export function deletePlatformLogo() {
  return centralRequest("DELETE", "platform-settings/logo");
}
