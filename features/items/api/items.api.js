import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames, parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchItems(params = {}) {
  return fetchPaginatedResource("items", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchItemNames() {
  return fetchResourceNames("items");
}

/**
 * Slim paginated items for invoice line typeahead.
 *
 * @param {{
 *   context: "sale" | "purchase";
 *   search?: string;
 *   page?: number;
 *   per_page?: number;
 * }} params
 */
export async function fetchItemsForInvoice(params) {
  const qs = toListQuery({
    section: "for-invoice",
    ...params,
  }).toString();
  const payload = await tenantRequest("GET", qs ? `items?${qs}` : "items?section=for-invoice");
  return parsePaginatedList(payload, params);
}

/**
 * UOMs + barcodes + prices for one selected invoice line item (single round-trip).
 *
 * @param {number | string} itemId
 * @returns {Promise<{ item_id?: string; item_uoms?: Array<Record<string, unknown>> }>}
 */
export function fetchItemInvoiceLineSetup(itemId) {
  return tenantRequest("GET", `items/${itemId}/invoice-line-setup`);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchItem(id) {
  return tenantRequest("GET", `items/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createItem(body) {
  return tenantRequest("POST", "items", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateItem(id, body) {
  return tenantRequest("PUT", `items/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteItem(id) {
  return tenantRequest("DELETE", `items/${id}`);
}
