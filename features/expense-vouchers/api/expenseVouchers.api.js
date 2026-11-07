import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchExpenseVouchers(params = {}) {
  return fetchPaginatedResource("expense-vouchers", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchExpenseVoucherNames() {
  return fetchResourceNames("expense-vouchers");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchExpenseVoucher(id) {
  return tenantRequest("GET", `expense-vouchers/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createExpenseVoucher(body) {
  return tenantRequest("POST", "expense-vouchers", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateExpenseVoucher(id, body) {
  return tenantRequest("PUT", `expense-vouchers/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteExpenseVoucher(id) {
  return tenantRequest("DELETE", `expense-vouchers/${id}`);
}

/** @param {string} id */
export function postExpenseVoucher(id) {
  return tenantRequest("POST", `expense-vouchers/${id}/post`);
}

/** @param {string} id */
export function reverseExpenseVoucher(id) {
  return tenantRequest("POST", `expense-vouchers/${id}/reverse`);
}
