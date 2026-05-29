import tenantApiService from "@/API/TenantApiService";

/**
 * @param {{ refresh?: boolean }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function fetchCategories({ refresh = false } = {}) {
  const endpoint = refresh ? "categories?refresh=1" : "categories";
  const data = await tenantApiService("GET", endpoint);
  return Array.isArray(data) ? data : [];
}

/**
 * Leaf categories only (assignable on items).
 *
 * @param {{ refresh?: boolean }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function fetchLeafCategories({ refresh = false } = {}) {
  const qs = refresh ? "?leaves_only=1&refresh=1" : "?leaves_only=1";
  const data = await tenantApiService("GET", `categories${qs}`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCategory(id) {
  return tenantApiService("GET", `categories/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCategory(body) {
  return tenantApiService("POST", "categories", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCategory(id, body) {
  return tenantApiService("PUT", `categories/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCategory(id) {
  return tenantApiService("DELETE", `categories/${id}`);
}
