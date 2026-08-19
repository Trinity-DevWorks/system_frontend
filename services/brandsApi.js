import tenantApiService from "@/API/TenantApiService";
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
  return tenantApiService("GET", `brands/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createBrand(body) {
  return tenantApiService("POST", "brands", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateBrand(id, body) {
  return tenantApiService("PUT", `brands/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteBrand(id) {
  return tenantApiService("DELETE", `brands/${id}`);
}
