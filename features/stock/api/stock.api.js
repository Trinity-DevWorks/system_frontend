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
export function fetchStockBalance(itemId, warehouseId, lotId = null) {
  const query = new URLSearchParams({
    item_id: String(itemId),
    warehouse_id: String(warehouseId),
  });
  if (lotId != null && lotId !== "") {
    query.set("lot_id", String(lotId));
  }
  return tenantRequest("GET", `stock/balances/show?${query.toString()}`);
}

/**
 * @param {number | string} itemId
 * @param {number | null | undefined} [warehouseId]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchStockLots(itemId, warehouseId = null) {
  const query = new URLSearchParams({
    item_id: String(itemId),
  });
  if (warehouseId != null && warehouseId !== "") {
    query.set("warehouse_id", String(warehouseId));
  }
  const payload = await tenantRequest("GET", `stock/lots?${query.toString()}`);
  return Array.isArray(payload) ? payload : [];
}

/**
 * @param {{
 *   warehouse_id?: number;
 *   search?: string;
 *   expired?: boolean;
 *   missing_expiry?: boolean;
 *   only_with_stock?: boolean;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchInventoryLots(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/inventory-lots?${qs}` : "stock/inventory-lots");
  return parsePaginatedList(payload, params);
}

/**
 * @param {number | string} lotId
 * @param {{ expiry_date?: string | null }} body
 */
export function updateInventoryLot(lotId, body) {
  return tenantRequest("PUT", `stock/inventory-lots/${encodeURIComponent(String(lotId))}`, body);
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

