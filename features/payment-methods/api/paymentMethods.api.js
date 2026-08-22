import { tenantRequest } from "@/lib/axios";
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
  return tenantRequest("GET", `payment-methods/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createPaymentMethod(body) {
  return tenantRequest("POST", "payment-methods", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updatePaymentMethod(id, body) {
  return tenantRequest("PUT", `payment-methods/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deletePaymentMethod(id) {
  return tenantRequest("DELETE", `payment-methods/${id}`);
}
