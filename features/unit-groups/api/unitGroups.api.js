import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchUnitGroups(params = {}) {
  return fetchPaginatedResource("unit-groups", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchUnitGroupNames() {
  return fetchResourceNames("unit-groups");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchUnitGroup(id) {
  return tenantRequest("GET", `unit-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createUnitGroup(body) {
  return tenantRequest("POST", "unit-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateUnitGroup(id, body) {
  return tenantRequest("PUT", `unit-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteUnitGroup(id) {
  return tenantRequest("DELETE", `unit-groups/${id}`);
}
