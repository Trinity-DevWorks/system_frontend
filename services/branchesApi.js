import tenantApiService from "@/API/TenantApiService";
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
  return tenantApiService("GET", `branches/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createBranch(body) {
  return tenantApiService("POST", "branches", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateBranch(id, body) {
  return tenantApiService("PUT", `branches/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteBranch(id) {
  return tenantApiService("DELETE", `branches/${id}`);
}
