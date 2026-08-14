import tenantApiService from "@/API/TenantApiService";

/**
 * @param {{ warehouse_id?: number; item_id?: number; search?: string; only_with_stock?: boolean }} [params]
 * @returns {Promise<unknown[]>}
 */
export async function fetchStockBalances(params = {}) {
  const query = new URLSearchParams();
  if (params.warehouse_id != null) query.set("warehouse_id", String(params.warehouse_id));
  if (params.item_id != null) query.set("item_id", String(params.item_id));
  if (params.search) query.set("search", params.search);
  if (params.only_with_stock) query.set("only_with_stock", "1");

  const qs = query.toString();
  const endpoint = qs ? `stock/balances?${qs}` : "stock/balances";
  const data = await tenantApiService("GET", endpoint);
  return Array.isArray(data) ? data : [];
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
  return tenantApiService("GET", `stock/balances/show?${query.toString()}`);
}

/**
 * @param {{
 *   warehouse_id?: number;
 *   item_id?: number;
 *   type?: string;
 *   from?: string;
 *   to?: string;
 *   limit?: number;
 * }} [params]
 * @returns {Promise<unknown[]>}
 */
export async function fetchStockMovements(params = {}) {
  const query = new URLSearchParams();
  if (params.warehouse_id != null) query.set("warehouse_id", String(params.warehouse_id));
  if (params.item_id != null) query.set("item_id", String(params.item_id));
  if (params.type) query.set("type", params.type);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.limit != null) query.set("limit", String(params.limit));

  const qs = query.toString();
  const endpoint = qs ? `stock/movements?${qs}` : "stock/movements";
  const data = await tenantApiService("GET", endpoint);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} movementId
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchStockMovement(movementId) {
  return tenantApiService("GET", `stock/movements/${encodeURIComponent(String(movementId))}`);
}

/**
 * Manual stock adjustment (quantity_delta in base UOM; negative = out).
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function postStockAdjustment(body) {
  return tenantApiService("POST", "stock/adjustments", body);
}
