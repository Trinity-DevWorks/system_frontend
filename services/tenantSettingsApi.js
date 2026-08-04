import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchTenantSettings() {
  return tenantApiService("GET", "tenant-settings");
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export function updateTenantSettings(body) {
  return tenantApiService("PUT", "tenant-settings", body);
}
