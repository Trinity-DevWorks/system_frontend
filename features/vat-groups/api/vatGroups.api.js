import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchVatGroups(params = {}) {
  return fetchPaginatedResource("vat-groups", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchVatGroupNames() {
  return fetchResourceNames("vat-groups");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchVatGroup(id) {
  return tenantRequest("GET", `vat-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createVatGroup(body) {
  return tenantRequest("POST", "vat-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateVatGroup(id, body) {
  return tenantRequest("PUT", `vat-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteVatGroup(id) {
  return tenantRequest("DELETE", `vat-groups/${id}`);
}
