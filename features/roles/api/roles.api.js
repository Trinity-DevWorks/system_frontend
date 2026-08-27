import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchRoles(params = {}) {
  return fetchPaginatedResource("roles", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchRoleNames() {
  return fetchResourceNames("roles");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchRole(id) {
  return tenantRequest("GET", `roles/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createRole(body) {
  return tenantRequest("POST", "roles", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateRole(id, body) {
  return tenantRequest("PUT", `roles/${id}`, body);
}

/**
 * Roles available for the permissions matrix picker (permissions.view).
 * @returns {Promise<unknown[]>}
 */
export async function fetchPermissionRoles() {
  const data = await tenantRequest("GET", "permissions/roles");
  return Array.isArray(data) ? data : [];
}

/**
 * Role detail including permission matrix (permissions.view).
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchRolePermissions(id) {
  return tenantRequest("GET", `roles/${id}/permissions`);
}

/**
 * Replace a role's permission matrix (permissions.edit).
 * @param {number | string} id
 * @param {Array<Record<string, unknown>>} permissions
 * @returns {Promise<unknown>}
 */
export function updateRolePermissions(id, permissions) {
  return tenantRequest("PUT", `roles/${id}/permissions`, { permissions });
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteRole(id) {
  return tenantRequest("DELETE", `roles/${id}`);
}
