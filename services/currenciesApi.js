import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchCurrencies() {
  const data = await tenantApiService("GET", "currencies");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCurrency(id) {
  return tenantApiService("GET", `currencies/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCurrency(body) {
  return tenantApiService("POST", "currencies", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCurrency(id, body) {
  return tenantApiService("PUT", `currencies/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCurrency(id) {
  return tenantApiService("DELETE", `currencies/${id}`);
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
  return tenantApiService("GET", `currencies/${currencyId}/rate-history`, null, { params });
}

/**
 * All current pair rates (single request). For exchange-rates management UI.
 * @returns {Promise<unknown[]>}
 */
export async function fetchCurrencyPairRates() {
  const data = await tenantApiService("GET", "currencies/pair-rates");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {{ currencies: string[]; primary_currency_code: string }} body
 * @returns {Promise<unknown>}
 */
export function fetchOnlineExchangeRates(body) {
  return tenantApiService("POST", "currencies/fetch-exchange-rates", body);
}
