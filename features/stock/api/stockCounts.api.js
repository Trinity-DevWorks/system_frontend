import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   warehouse_id?: number;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchStockCounts(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/stock-counts?${qs}` : "stock/stock-counts");
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createStockCount(body) {
  return tenantRequest("POST", "stock/stock-counts", body);
}

/**
 * @param {string} documentId
 */
export function fetchStockCount(documentId) {
  return tenantRequest("GET", `stock/stock-counts/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {Record<string, unknown>} body
 */
export function updateStockCount(documentId, body) {
  return tenantRequest("PUT", `stock/stock-counts/${documentId}`, body);
}

/**
 * @param {string} documentId
 */
export function deleteStockCount(documentId) {
  return tenantRequest("DELETE", `stock/stock-counts/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export async function syncStockCountLines(documentId, body) {
  const data = await tenantRequest("PUT", `stock/stock-counts/${documentId}/lines/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} documentId
 */
export function loadStockCountBalances(documentId) {
  return tenantRequest("POST", `stock/stock-counts/${documentId}/load-balances`);
}

/**
 * @param {string} documentId
 */
export function postStockCount(documentId) {
  return tenantRequest("POST", `stock/stock-counts/${documentId}/post`);
}
