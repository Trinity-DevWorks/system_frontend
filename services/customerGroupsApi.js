import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchCustomerGroups() {
  const data = await tenantApiService("GET", "customer-groups");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCustomerGroup(id) {
  return tenantApiService("GET", `customer-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCustomerGroup(body) {
  return tenantApiService("POST", "customer-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCustomerGroup(id, body) {
  return tenantApiService("PUT", `customer-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCustomerGroup(id) {
  return tenantApiService("DELETE", `customer-groups/${id}`);
}
