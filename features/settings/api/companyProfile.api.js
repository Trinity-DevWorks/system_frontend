import { tenantRequest } from "@/lib/axios";

/**
 * Singleton company profile (identity / branding).
 * Aligns with GET/PUT company-profile.
 */

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchCompanyProfile() {
  return tenantRequest("GET", "company-profile");
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export function updateCompanyProfile(body) {
  return tenantRequest("PUT", "company-profile", body);
}
