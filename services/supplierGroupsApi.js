import tenantApiService from "@/API/TenantApiService";
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
  return tenantApiService("GET", `supplier-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSupplierGroup(body) {
  return tenantApiService("POST", "supplier-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSupplierGroup(id, body) {
  return tenantApiService("PUT", `supplier-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSupplierGroup(id) {
  return tenantApiService("DELETE", `supplier-groups/${id}`);
}
