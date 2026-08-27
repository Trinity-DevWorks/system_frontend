import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchSupplierGroups(params = {}) {
  return fetchPaginatedResource("supplier-groups", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchSupplierGroupNames() {
  return fetchResourceNames("supplier-groups");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchSupplierGroup(id) {
  return tenantRequest("GET", `supplier-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSupplierGroup(body) {
  return tenantRequest("POST", "supplier-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSupplierGroup(id, body) {
  return tenantRequest("PUT", `supplier-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSupplierGroup(id) {
  return tenantRequest("DELETE", `supplier-groups/${id}`);
}
