import tenantApiService from "@/API/TenantApiService";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchPaymentMethods(params = {}) {
  return fetchPaginatedResource("payment-methods", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchPaymentMethodNames() {
  return fetchResourceNames("payment-methods");
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
