import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchPriceLists(params = {}) {
  return fetchPaginatedResource("price-lists", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchPriceListNames() {
  return fetchResourceNames("price-lists");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchPriceList(id) {
  return tenantRequest("GET", `price-lists/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createPriceList(body) {
  return tenantRequest("POST", "price-lists", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updatePriceList(id, body) {
  return tenantRequest("PUT", `price-lists/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deletePriceList(id) {
  return tenantRequest("DELETE", `price-lists/${id}`);
}

/**
 * Default unit prices for sales document lines (customer / group / branch / default list, else catalog).
 *
 * @param {{
 *   customer_id?: string | null;
 *   currency_id: number;
 *   exchange_rate?: number | string | null;
 *   date?: string | null;
 *   lines: Array<{ item_id: string; item_uom_id?: number | null; quantity?: number | string | null }>;
 * }} body
 * @returns {Promise<Array<{ item_id: string; item_uom_id: number | null; unit_price: string | null; price_source: string; price_list_id: number | null }>>}
 */
export function resolvePrices(body) {
  return tenantRequest("POST", "pricing/resolve", body);
}
