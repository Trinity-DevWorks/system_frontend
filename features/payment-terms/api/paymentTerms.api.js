import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchPaymentTerms(params = {}) {
  return fetchPaginatedResource("payment-terms", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchPaymentTermNames() {
  return fetchResourceNames("payment-terms");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchPaymentTerm(id) {
  return tenantRequest("GET", `payment-terms/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createPaymentTerm(body) {
  return tenantRequest("POST", "payment-terms", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updatePaymentTerm(id, body) {
  return tenantRequest("PUT", `payment-terms/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deletePaymentTerm(id) {
  return tenantRequest("DELETE", `payment-terms/${id}`);
}
