import tenantApiService from "@/API/TenantApiService";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchSuppliers(params = {}) {
  return fetchPaginatedResource("suppliers", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchSupplierNames() {
  return fetchResourceNames("suppliers");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchSupplier(id) {
  return tenantApiService("GET", `suppliers/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSupplier(body) {
  return tenantApiService("POST", "suppliers", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSupplier(id, body) {
  return tenantApiService("PUT", `suppliers/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSupplier(id) {
  return tenantApiService("DELETE", `suppliers/${id}`);
}
