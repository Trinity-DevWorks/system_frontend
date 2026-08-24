import { tenantRequest } from "@/lib/axios";
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
  return tenantRequest("GET", `suppliers/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSupplier(body) {
  return tenantRequest("POST", "suppliers", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSupplier(id, body) {
  return tenantRequest("PUT", `suppliers/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSupplier(id) {
  return tenantRequest("DELETE", `suppliers/${id}`);
}
