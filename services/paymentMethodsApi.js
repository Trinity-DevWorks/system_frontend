import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchPaymentMethods() {
  const data = await tenantApiService("GET", "payment-methods");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchPaymentMethod(id) {
  return tenantApiService("GET", `payment-methods/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createPaymentMethod(body) {
  return tenantApiService("POST", "payment-methods", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updatePaymentMethod(id, body) {
  return tenantApiService("PUT", `payment-methods/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deletePaymentMethod(id) {
  return tenantApiService("DELETE", `payment-methods/${id}`);
}
