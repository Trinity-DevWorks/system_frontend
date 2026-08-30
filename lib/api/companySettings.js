import { tenantRequest } from "@/lib/axios";

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchCompanySettings() {
  return tenantRequest("GET", "company-settings");
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export function updateCompanySettings(body) {
  return tenantRequest("PUT", "company-settings", body);
}
