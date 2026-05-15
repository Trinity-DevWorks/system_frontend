import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchPaymentTerms() {
  const data = await tenantApiService("GET", "payment-terms");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchPaymentTerm(id) {
  return tenantApiService("GET", `payment-terms/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createPaymentTerm(body) {
  return tenantApiService("POST", "payment-terms", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updatePaymentTerm(id, body) {
  return tenantApiService("PUT", `payment-terms/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deletePaymentTerm(id) {
  return tenantApiService("DELETE", `payment-terms/${id}`);
}
