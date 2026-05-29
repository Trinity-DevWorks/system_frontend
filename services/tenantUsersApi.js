import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchTenantUsers() {
  const data = await tenantApiService("GET", "users");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchTenantUser(id) {
  return tenantApiService("GET", `users/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createTenantUser(body) {
  return tenantApiService("POST", "users", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateTenantUser(id, body) {
  return tenantApiService("PUT", `users/${id}`, body);
}

/**
 * @param {number | string} id
 * @param {number} roleId
 * @returns {Promise<unknown>}
 */
export function updateTenantUserRole(id, roleId) {
  return tenantApiService("PATCH", `users/${id}/role`, { role_id: roleId });
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteTenantUser(id) {
  return tenantApiService("DELETE", `users/${id}`);
}
