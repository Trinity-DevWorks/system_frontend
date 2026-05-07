import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchVatGroups() {
  const data = await tenantApiService("GET", "vat-groups");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchVatGroup(id) {
  return tenantApiService("GET", `vat-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createVatGroup(body) {
  return tenantApiService("POST", "vat-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateVatGroup(id, body) {
  return tenantApiService("PUT", `vat-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteVatGroup(id) {
  return tenantApiService("DELETE", `vat-groups/${id}`);
}
