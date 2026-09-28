import { centralRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchCentralRoles(params = {}) {
  return fetchPaginatedResource("roles", params, centralRequest);
}

/** @returns {Promise<unknown[]>} */
export function fetchCentralRoleNames() {
  return fetchResourceNames("roles", centralRequest);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCentralRole(id) {
  return centralRequest("GET", `roles/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCentralRole(body) {
  return centralRequest("POST", "roles", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCentralRole(id, body) {
  return centralRequest("PUT", `roles/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCentralRole(id) {
  return centralRequest("DELETE", `roles/${id}`);
}
