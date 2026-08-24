import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchCustomerGroups(params = {}) {
  return fetchPaginatedResource("customer-groups", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchCustomerGroupNames() {
  return fetchResourceNames("customer-groups");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCustomerGroup(id) {
  return tenantRequest("GET", `customer-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCustomerGroup(body) {
  return tenantRequest("POST", "customer-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCustomerGroup(id, body) {
  return tenantRequest("PUT", `customer-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCustomerGroup(id) {
  return tenantRequest("DELETE", `customer-groups/${id}`);
}
