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
export async function fetchStockRevaluations(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/revaluations?${qs}` : "stock/revaluations");
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createStockRevaluation(body) {
  return tenantRequest("POST", "stock/revaluations", body);
}

/**
 * @param {string} documentId
 */
export function fetchStockRevaluation(documentId) {
  return tenantRequest("GET", `stock/revaluations/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {Record<string, unknown>} body
 */
export function updateStockRevaluation(documentId, body) {
  return tenantRequest("PUT", `stock/revaluations/${documentId}`, body);
}

/**
 * @param {string} documentId
 */
export function deleteStockRevaluation(documentId) {
  return tenantRequest("DELETE", `stock/revaluations/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export async function syncStockRevaluationLines(documentId, body) {
  const data = await tenantRequest("PUT", `stock/revaluations/${documentId}/lines`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} documentId
 */
export function postStockRevaluationDocument(documentId) {
  return tenantRequest("POST", `stock/revaluations/${documentId}/post`);
}

/** @param {string} documentId */
export function reverseStockRevaluationDocument(documentId) {
  return tenantRequest("POST", `stock/revaluations/${documentId}/reverse`);
}

/**
 * @param {{
 *   warehouse_id: number;
 *   item_id: string;
 *   lot_id?: number | null;
 * }} params
 * @returns {Promise<{ quantity: string; unit_cost: string; inventory_value: string }>}
 */
export function fetchStockRevaluationBalanceHint(params) {
  const qs = new URLSearchParams();
  qs.set("warehouse_id", String(params.warehouse_id));
  qs.set("item_id", String(params.item_id));
  if (params.lot_id != null) qs.set("lot_id", String(params.lot_id));
  return tenantRequest("GET", `stock/revaluations/balance-hint?${qs.toString()}`);
}
