import { tenantRequest } from "@/lib/axios";
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
  return tenantRequest("GET", `salesmen/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSalesman(body) {
  return tenantRequest("POST", "salesmen", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSalesman(id, body) {
  return tenantRequest("PUT", `salesmen/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSalesman(id) {
  return tenantRequest("DELETE", `salesmen/${id}`);
}
