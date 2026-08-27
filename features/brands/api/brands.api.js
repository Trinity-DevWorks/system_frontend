import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchBrands(params = {}) {
  return fetchPaginatedResource("brands", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchBrandNames() {
  return fetchResourceNames("brands");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchBrand(id) {
  return tenantRequest("GET", `brands/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createBrand(body) {
  return tenantRequest("POST", "brands", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateBrand(id, body) {
  return tenantRequest("PUT", `brands/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteBrand(id) {
  return tenantRequest("DELETE", `brands/${id}`);
}
