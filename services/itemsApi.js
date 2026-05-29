import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchItems() {
  const data = await tenantApiService("GET", "items");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchItem(id) {
  return tenantApiService("GET", `items/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createItem(body) {
  return tenantApiService("POST", "items", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateItem(id, body) {
  return tenantApiService("PUT", `items/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteItem(id) {
  return tenantApiService("DELETE", `items/${id}`);
}
