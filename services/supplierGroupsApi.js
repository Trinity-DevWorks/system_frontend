import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchSupplierGroups() {
  const data = await tenantApiService("GET", "supplier-groups");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchSupplierGroup(id) {
  return tenantApiService("GET", `supplier-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSupplierGroup(body) {
  return tenantApiService("POST", "supplier-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSupplierGroup(id, body) {
  return tenantApiService("PUT", `supplier-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSupplierGroup(id) {
  return tenantApiService("DELETE", `supplier-groups/${id}`);
}
