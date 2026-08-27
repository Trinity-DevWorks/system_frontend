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
export async function fetchOpeningStocks(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/opening-stocks?${qs}` : "stock/opening-stocks");
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createOpeningStock(body) {
  return tenantRequest("POST", "stock/opening-stocks", body);
}

/**
 * @param {string} documentId
 */
export function fetchOpeningStock(documentId) {
  return tenantRequest("GET", `stock/opening-stocks/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {Record<string, unknown>} body
 */
export function updateOpeningStock(documentId, body) {
  return tenantRequest("PUT", `stock/opening-stocks/${documentId}`, body);
}

/**
 * @param {string} documentId
 */
export function deleteOpeningStock(documentId) {
  return tenantRequest("DELETE", `stock/opening-stocks/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export async function syncOpeningStockLines(documentId, body) {
  const data = await tenantRequest("PUT", `stock/opening-stocks/${documentId}/lines/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} documentId
 */
export function postOpeningStock(documentId) {
  return tenantRequest("POST", `stock/opening-stocks/${documentId}/post`);
}
