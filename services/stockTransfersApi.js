import tenantApiService from "@/API/TenantApiService";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   from_warehouse_id?: number;
 *   to_warehouse_id?: number;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchStockTransfers(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantApiService("GET", qs ? `stock/transfers?${qs}` : "stock/transfers");
  return parsePaginatedList(payload, params);
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
