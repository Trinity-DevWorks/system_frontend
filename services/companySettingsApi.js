import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchCompanySettings() {
  return tenantApiService("GET", "company-settings");
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export function updateCompanySettings(body) {
  return tenantApiService("PUT", "company-settings", body);
}
