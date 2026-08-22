import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchTenantUsers(params = {}) {
  return fetchPaginatedResource("users", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchTenantUserNames() {
  return fetchResourceNames("users");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchTenantUser(id) {
  return tenantRequest("GET", `users/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createTenantUser(body) {
  return tenantRequest("POST", "users", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateTenantUser(id, body) {
  return tenantRequest("PUT", `users/${id}`, body);
}

/**
 * @param {number | string} id
 * @param {number} roleId
 * @param {number | null | undefined} [branchId]
 * @returns {Promise<unknown>}
 */
export function updateTenantUserRole(id, roleId, branchId = null) {
  /** @type {Record<string, unknown>} */
  const body = { role_id: roleId };
  if (branchId != null) {
    body.branch_id = branchId;
  }
  return tenantRequest("PATCH", `users/${id}/role`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteTenantUser(id) {
  return tenantRequest("DELETE", `users/${id}`);
}
