import tenantApiService from "@/API/TenantApiService";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchSalesmen(params = {}) {
  return fetchPaginatedResource("salesmen", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchSalesmanNames() {
  return fetchResourceNames("salesmen");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchSalesman(id) {
  return tenantApiService("GET", `salesmen/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSalesman(body) {
  return tenantApiService("POST", "salesmen", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSalesman(id, body) {
  return tenantApiService("PUT", `salesmen/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSalesman(id) {
  return tenantApiService("DELETE", `salesmen/${id}`);
}
