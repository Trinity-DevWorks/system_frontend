import { tenantRequest } from "@/lib/axios";
import { downloadPartyLedger } from "@/features/party-ledger/api/partyLedger.api";

/**
 * @param {string} endpoint
 * @param {Record<string, string | number | boolean | undefined | null>} [params]
 */
function withQuery(endpoint, params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, value === true ? "1" : String(value));
  }
  const qs = search.toString();
  return qs ? `${endpoint}?${qs}` : endpoint;
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function fetchOverview() {
  return tenantRequest("GET", "overview");
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function fetchSalesByPeriod(params) {
  return tenantRequest("GET", withQuery("reports/sales-by-period", params));
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function downloadSalesByPeriod(params) {
  return downloadPartyLedger("reports/sales-by-period/export", params);
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function fetchPurchasesByPeriod(params) {
  return tenantRequest("GET", withQuery("reports/purchases-by-period", params));
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function downloadPurchasesByPeriod(params) {
  return downloadPartyLedger("reports/purchases-by-period/export", params);
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function fetchCustomerAging(params) {
  return tenantRequest("GET", withQuery("reports/customer-aging", params));
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function downloadCustomerAging(params) {
  return downloadPartyLedger("reports/customer-aging/export", params);
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function fetchSupplierAging(params) {
  return tenantRequest("GET", withQuery("reports/supplier-aging", params));
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function downloadSupplierAging(params) {
  return downloadPartyLedger("reports/supplier-aging/export", params);
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function fetchStockValuation(params) {
  return tenantRequest("GET", withQuery("reports/stock-valuation", params));
}

/** @param {Record<string, string | number | boolean | undefined | null>} params */
export function downloadStockValuation(params) {
  return downloadPartyLedger("reports/stock-valuation/export", params);
}

export const REPORTS_QUERY_KEY = ["tenant", "reports"];
export const OVERVIEW_QUERY_KEY = ["tenant", "overview"];
