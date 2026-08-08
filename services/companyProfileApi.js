import tenantApiService from "@/API/TenantApiService";

/**
 * Singleton company profile (identity / branding).
 * Aligns with GET/PUT company-profile.
 */

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchCompanyProfile() {
  return tenantApiService("GET", "company-profile");
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export function updateCompanyProfile(body) {
  return tenantApiService("PUT", "company-profile", body);
}
