import { tenantRequest } from "@/lib/axios";

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchTenantSettings() {
  return tenantRequest("GET", "tenant-settings");
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export function updateTenantSettings(body) {
  return tenantRequest("PUT", "tenant-settings", body);
}
