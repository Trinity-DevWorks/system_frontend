import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchUnitGroups() {
  const data = await tenantApiService("GET", "unit-groups");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchUnitGroup(id) {
  return tenantApiService("GET", `unit-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createUnitGroup(body) {
  return tenantApiService("POST", "unit-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateUnitGroup(id, body) {
  return tenantApiService("PUT", `unit-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteUnitGroup(id) {
  return tenantApiService("DELETE", `unit-groups/${id}`);
}
