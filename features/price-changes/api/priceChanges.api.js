import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

export const PRICE_CHANGES_QUERY_KEY = /** @type {const} */ ([
  "tenant",
  "price-changes",
]);

/** @param {Record<string, string | number | boolean | undefined | null>} [params] */
export function fetchPriceChanges(params = {}) {
  return fetchPaginatedResource("price-changes", params);
}

/** @param {string} id */
export function fetchPriceChange(id) {
  return tenantRequest("GET", `price-changes/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createPriceChange(body) {
  return tenantRequest("POST", "price-changes", body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function updatePriceChange(id, body) {
  return tenantRequest("PUT", `price-changes/${id}`, body);
}

/** @param {string} id */
export function deletePriceChange(id) {
  return tenantRequest("DELETE", `price-changes/${id}`);
}

/** @param {Record<string, unknown>} body */
export function previewPriceChangeBulk(body) {
  return tenantRequest("POST", "price-changes/bulk-preview", body);
}

/** @param {string} id */
export function applyPriceChange(id) {
  return tenantRequest("POST", `price-changes/${id}/apply`);
}

/** @param {string} id */
export function cancelPriceChange(id) {
  return tenantRequest("POST", `price-changes/${id}/cancel`);
}

/** @param {string} itemId */
export function fetchItemPriceHistory(itemId) {
  return tenantRequest("GET", `items/${itemId}/price-history`);
}
