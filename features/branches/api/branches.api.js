import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchBranches(params = {}) {
  return fetchPaginatedResource("branches", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchBranchNames() {
  return fetchResourceNames("branches");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchBranch(id) {
  return tenantRequest("GET", `branches/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createBranch(body) {
  return tenantRequest("POST", "branches", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateBranch(id, body) {
  return tenantRequest("PUT", `branches/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteBranch(id) {
  return tenantRequest("DELETE", `branches/${id}`);
}
