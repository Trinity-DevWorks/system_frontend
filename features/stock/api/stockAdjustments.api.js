import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   warehouse_id?: number;
 *   reason_id?: number;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchStockAdjustments(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/adjustments?${qs}` : "stock/adjustments");
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createStockAdjustment(body) {
  return tenantRequest("POST", "stock/adjustments", body);
}

/**
 * @param {string} documentId
 */
export function fetchStockAdjustment(documentId) {
  return tenantRequest("GET", `stock/adjustments/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {Record<string, unknown>} body
 */
export function updateStockAdjustment(documentId, body) {
  return tenantRequest("PUT", `stock/adjustments/${documentId}`, body);
}

/**
 * @param {string} documentId
 */
export function deleteStockAdjustment(documentId) {
  return tenantRequest("DELETE", `stock/adjustments/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export async function syncStockAdjustmentLines(documentId, body) {
  const data = await tenantRequest("PUT", `stock/adjustments/${documentId}/lines/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} documentId
 */
export function postStockAdjustmentDocument(documentId) {
  return tenantRequest("POST", `stock/adjustments/${documentId}/post`);
}
