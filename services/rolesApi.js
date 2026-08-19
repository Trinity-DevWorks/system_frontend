import tenantApiService from "@/API/TenantApiService";
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
  return tenantApiService("GET", `roles/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createRole(body) {
  return tenantApiService("POST", "roles", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateRole(id, body) {
  return tenantApiService("PUT", `roles/${id}`, body);
}

/**
 * Roles available for the permissions matrix picker (permissions.view).
 * @returns {Promise<unknown[]>}
 */
export async function fetchPermissionRoles() {
  const data = await tenantApiService("GET", "permissions/roles");
  return Array.isArray(data) ? data : [];
}

/**
 * Role detail including permission matrix (permissions.view).
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchRolePermissions(id) {
  return tenantApiService("GET", `roles/${id}/permissions`);
}

/**
 * Replace a role's permission matrix (permissions.edit).
 * @param {number | string} id
 * @param {Array<Record<string, unknown>>} permissions
 * @returns {Promise<unknown>}
 */
export function updateRolePermissions(id, permissions) {
  return tenantApiService("PUT", `roles/${id}/permissions`, { permissions });
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteRole(id) {
  return tenantApiService("DELETE", `roles/${id}`);
}
