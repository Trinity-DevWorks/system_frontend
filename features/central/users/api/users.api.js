import { centralRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchCentralUsers(params = {}) {
  return fetchPaginatedResource("users", params, centralRequest);
}

/** @returns {Promise<unknown[]>} */
export function fetchCentralUserNames() {
  return fetchResourceNames("users", centralRequest);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCentralUser(id) {
  return centralRequest("GET", `users/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCentralUser(body) {
  return centralRequest("POST", "users", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCentralUser(id, body) {
  return centralRequest("PUT", `users/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCentralUser(id) {
  return centralRequest("DELETE", `users/${id}`);
}
