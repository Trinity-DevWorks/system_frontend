import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchCustomers(params = {}) {
  return fetchPaginatedResource("customers", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchCustomerNames() {
  return fetchResourceNames("customers");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCustomer(id) {
  return tenantRequest("GET", `customers/${id}`, null, { params: { section: "full" } });
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCustomer(body) {
  return tenantRequest("POST", "customers", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCustomer(id, body) {
  return tenantRequest("PUT", `customers/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCustomer(id) {
  return tenantRequest("DELETE", `customers/${id}`);
}
