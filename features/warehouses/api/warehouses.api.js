import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchWarehouses(params = {}) {
  return fetchPaginatedResource("warehouses", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchWarehouseNames() {
  return fetchResourceNames("warehouses");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchWarehouse(id) {
  return tenantRequest("GET", `warehouses/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createWarehouse(body) {
  return tenantRequest("POST", "warehouses", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateWarehouse(id, body) {
  return tenantRequest("PUT", `warehouses/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteWarehouse(id) {
  return tenantRequest("DELETE", `warehouses/${id}`);
}
