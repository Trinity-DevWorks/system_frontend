import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchCashBankAccounts(params = {}) {
  return fetchPaginatedResource("cash-bank-accounts", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchCashBankAccountNames() {
  return fetchResourceNames("cash-bank-accounts");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCashBankAccount(id) {
  return tenantRequest("GET", `cash-bank-accounts/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCashBankAccount(body) {
  return tenantRequest("POST", "cash-bank-accounts", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCashBankAccount(id, body) {
  return tenantRequest("PUT", `cash-bank-accounts/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCashBankAccount(id) {
  return tenantRequest("DELETE", `cash-bank-accounts/${id}`);
}
