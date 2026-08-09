import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchBranches() {
  const data = await tenantApiService("GET", "branches");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchBranch(id) {
  return tenantApiService("GET", `branches/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createBranch(body) {
  return tenantApiService("POST", "branches", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateBranch(id, body) {
  return tenantApiService("PUT", `branches/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteBranch(id) {
  return tenantApiService("DELETE", `branches/${id}`);
}
