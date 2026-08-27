import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   purchase_order_id?: string;
 *   warehouse_id?: number;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchGoodsReceipts(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/goods-receipts?${qs}` : "stock/goods-receipts");
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createGoodsReceipt(body) {
  return tenantRequest("POST", "stock/goods-receipts", body);
}

/**
 * @param {string} receiptId
 */
export function fetchGoodsReceipt(receiptId) {
  return tenantRequest("GET", `stock/goods-receipts/${receiptId}`);
}

/**
 * @param {string} receiptId
 * @param {Record<string, unknown>} body
 */
export function updateGoodsReceipt(receiptId, body) {
  return tenantRequest("PUT", `stock/goods-receipts/${receiptId}`, body);
}

/**
 * @param {string} receiptId
 */
export function deleteGoodsReceipt(receiptId) {
  return tenantRequest("DELETE", `stock/goods-receipts/${receiptId}`);
}

/**
 * @param {string} receiptId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export async function syncGoodsReceiptLines(receiptId, body) {
  const data = await tenantRequest("PUT", `stock/goods-receipts/${receiptId}/lines/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} receiptId
 */
export function postGoodsReceipt(receiptId) {
  return tenantRequest("POST", `stock/goods-receipts/${receiptId}/post`);
}
