import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{ warehouse_id?: number; item_id?: number; search?: string; only_with_stock?: boolean; page?: number; per_page?: number }} [params]
 */
export async function fetchStockBalances(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/balances?${qs}` : "stock/balances");
  return parsePaginatedList(payload, params);
}

/**
 * @param {number} itemId
 * @param {number} warehouseId
 * @returns {Promise<unknown>}
 */
export function fetchStockBalance(itemId, warehouseId) {
  const query = new URLSearchParams({
    item_id: String(itemId),
    warehouse_id: String(warehouseId),
  });
  return tenantRequest("GET", `stock/balances/show?${query.toString()}`);
}

/**
 * @param {{
 *   warehouse_id?: number;
 *   item_id?: number;
 *   type?: string;
 *   from?: string;
 *   to?: string;
 *   search?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchStockMovements(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/movements?${qs}` : "stock/movements");
  return parsePaginatedList(payload, params);
}

/**
 * @param {number | string} movementId
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchStockMovement(movementId) {
  return tenantRequest("GET", `stock/movements/${encodeURIComponent(String(movementId))}`);
}

/**
 * Manual stock adjustment (quantity_delta in base UOM; negative = out).
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function postStockAdjustment(body) {
  return tenantRequest("POST", "stock/adjustments", body);
}
