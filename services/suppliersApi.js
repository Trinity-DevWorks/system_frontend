import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchSuppliers() {
  const data = await tenantApiService("GET", "suppliers");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchSupplier(id) {
  return tenantApiService("GET", `suppliers/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSupplier(body) {
  return tenantApiService("POST", "suppliers", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSupplier(id, body) {
  return tenantApiService("PUT", `suppliers/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSupplier(id) {
  return tenantApiService("DELETE", `suppliers/${id}`);
}
