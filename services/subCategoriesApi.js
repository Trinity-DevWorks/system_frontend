import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchSubCategories() {
  const data = await tenantApiService("GET", "sub-categories");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchSubCategory(id) {
  return tenantApiService("GET", `sub-categories/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSubCategory(body) {
  return tenantApiService("POST", "sub-categories", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSubCategory(id, body) {
  return tenantApiService("PUT", `sub-categories/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSubCategory(id) {
  return tenantApiService("DELETE", `sub-categories/${id}`);
}
