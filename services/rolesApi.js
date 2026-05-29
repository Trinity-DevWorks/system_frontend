import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchRoles() {
  const data = await tenantApiService("GET", "roles");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchRole(id) {
  return tenantApiService("GET", `roles/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createRole(body) {
  return tenantApiService("POST", "roles", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateRole(id, body) {
  return tenantApiService("PUT", `roles/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteRole(id) {
  return tenantApiService("DELETE", `roles/${id}`);
}
