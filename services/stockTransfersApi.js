import tenantApiService from "@/API/TenantApiService";

/**
 * @param {{
 *   status?: string;
 *   from_warehouse_id?: number;
 *   to_warehouse_id?: number;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   limit?: number;
 * }} [params]
 * @returns {Promise<unknown[]>}
 */
export async function fetchStockTransfers(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.from_warehouse_id != null) query.set("from_warehouse_id", String(params.from_warehouse_id));
  if (params.to_warehouse_id != null) query.set("to_warehouse_id", String(params.to_warehouse_id));
  if (params.search) query.set("search", params.search);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.limit != null) query.set("limit", String(params.limit));

  const qs = query.toString();
  const endpoint = qs ? `stock/transfers?${qs}` : "stock/transfers";
  const data = await tenantApiService("GET", endpoint);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createStockTransfer(body) {
  return tenantApiService("POST", "stock/transfers", body);
}

/**
 * @param {number | string} transferId
 * @returns {Promise<unknown>}
 */
export function fetchStockTransfer(transferId) {
  return tenantApiService("GET", `stock/transfers/${transferId}`);
}

/**
 * @param {number | string} transferId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateStockTransfer(transferId, body) {
  return tenantApiService("PUT", `stock/transfers/${transferId}`, body);
}

/**
 * @param {number | string} transferId
 * @returns {Promise<unknown>}
 */
export function deleteStockTransfer(transferId) {
  return tenantApiService("DELETE", `stock/transfers/${transferId}`);
}

/**
 * @param {number | string} transferId
 * @param {{ lines: Array<{ item_id: number; quantity: number; item_uom_id?: number | null; notes?: string }> }} body
 * @returns {Promise<unknown[]>}
 */
export async function syncStockTransferLines(transferId, body) {
  const data = await tenantApiService("PUT", `stock/transfers/${transferId}/lines/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * Dispatch transfer (removes stock from source warehouse).
 * @param {number | string} transferId
 * @returns {Promise<unknown>}
 */
export function dispatchStockTransfer(transferId) {
  return tenantApiService("POST", `stock/transfers/${transferId}/dispatch`);
}

/**
 * Receive transfer (adds stock to destination warehouse).
 * @param {number | string} transferId
 * @returns {Promise<unknown>}
 */
export function receiveStockTransfer(transferId) {
  return tenantApiService("POST", `stock/transfers/${transferId}/receive`);
}

/**
 * @param {number | string} transferId
 * @returns {Promise<unknown>}
 */
export function cancelStockTransfer(transferId) {
  return tenantApiService("POST", `stock/transfers/${transferId}/cancel`);
}
