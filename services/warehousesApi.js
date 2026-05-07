import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchWarehouses() {
  const data = await tenantApiService("GET", "warehouses");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchWarehouse(id) {
  return tenantApiService("GET", `warehouses/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createWarehouse(body) {
  return tenantApiService("POST", "warehouses", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateWarehouse(id, body) {
  return tenantApiService("PUT", `warehouses/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteWarehouse(id) {
  return tenantApiService("DELETE", `warehouses/${id}`);
}
