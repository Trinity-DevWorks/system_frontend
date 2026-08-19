import tenantApiService from "@/API/TenantApiService";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchItems(params = {}) {
  return fetchPaginatedResource("items", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchItemNames() {
  return fetchResourceNames("items");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchItem(id) {
  return tenantApiService("GET", `items/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createItem(body) {
  return tenantApiService("POST", "items", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateItem(id, body) {
  return tenantApiService("PUT", `items/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteItem(id) {
  return tenantApiService("DELETE", `items/${id}`);
}
