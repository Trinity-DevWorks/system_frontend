import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchItemAttributesPage(params = {}) {
  return fetchPaginatedResource("item-attributes", params);
}

/** Every attribute with its values (variant picker). */
export function fetchItemAttributeNames() {
  return fetchResourceNames("item-attributes");
}

/** @param {number | string} id */
export function fetchItemAttribute(id) {
  return tenantRequest("GET", `item-attributes/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createItemAttribute(body) {
  return tenantRequest("POST", "item-attributes", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 */
export function updateItemAttribute(id, body) {
  return tenantRequest("PUT", `item-attributes/${id}`, body);
}

/** @param {number | string} id */
export function deleteItemAttribute(id) {
  return tenantRequest("DELETE", `item-attributes/${id}`);
}
