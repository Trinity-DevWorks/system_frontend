import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchCurrencies(params = {}) {
  return fetchPaginatedResource("currencies", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchCurrencyNames() {
  return fetchResourceNames("currencies");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCurrency(id) {
  return tenantRequest("GET", `currencies/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCurrency(body) {
  return tenantRequest("POST", "currencies", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCurrency(id, body) {
  return tenantRequest("PUT", `currencies/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCurrency(id) {
  return tenantRequest("DELETE", `currencies/${id}`);
}

/**
 * @param {number | string} currencyId
 * @param {{ from?: string; to?: string }} [query]
 * @returns {Promise<unknown>}
 */
export function fetchCurrencyRateHistory(currencyId, query = {}) {
  const params = {};
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;
  return tenantRequest("GET", `currencies/${currencyId}/rate-history`, null, { params });
}

/**
 * All current pair rates (single request). For exchange-rates management UI.
 * @returns {Promise<unknown[]>}
 */
export async function fetchCurrencyPairRates() {
  const data = await tenantRequest("GET", "currencies/pair-rates");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {{ currencies: string[]; primary_currency_code: string }} body
 * @returns {Promise<unknown>}
 */
export function fetchOnlineExchangeRates(body) {
  return tenantRequest("POST", "currencies/fetch-exchange-rates", body);
}
