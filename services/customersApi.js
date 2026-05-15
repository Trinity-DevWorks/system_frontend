import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchCustomers() {
  const data = await tenantApiService("GET", "customers");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCustomer(id) {
  return tenantApiService("GET", `customers/${id}`, null, { params: { section: "full" } });
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCustomer(body) {
  return tenantApiService("POST", "customers", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCustomer(id, body) {
  return tenantApiService("PUT", `customers/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCustomer(id) {
  return tenantApiService("DELETE", `customers/${id}`);
}
