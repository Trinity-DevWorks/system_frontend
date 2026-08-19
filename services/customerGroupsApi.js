import tenantApiService from "@/API/TenantApiService";
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
  return tenantApiService("GET", `customer-groups/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCustomerGroup(body) {
  return tenantApiService("POST", "customer-groups", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCustomerGroup(id, body) {
  return tenantApiService("PUT", `customer-groups/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCustomerGroup(id) {
  return tenantApiService("DELETE", `customer-groups/${id}`);
}
