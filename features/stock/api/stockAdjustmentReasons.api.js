import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchStockAdjustmentReasons(params = {}) {
  return fetchPaginatedResource("stock/adjustment-reasons", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchStockAdjustmentReasonNames() {
  return fetchResourceNames("stock/adjustment-reasons");
}

/**
 * @param {number | string} id
 */
export function fetchStockAdjustmentReason(id) {
  return tenantRequest("GET", `stock/adjustment-reasons/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createStockAdjustmentReason(body) {
  return tenantRequest("POST", "stock/adjustment-reasons", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 */
export function updateStockAdjustmentReason(id, body) {
  return tenantRequest("PUT", `stock/adjustment-reasons/${id}`, body);
}

/**
 * @param {number | string} id
 */
export function deleteStockAdjustmentReason(id) {
  return tenantRequest("DELETE", `stock/adjustment-reasons/${id}`);
}
