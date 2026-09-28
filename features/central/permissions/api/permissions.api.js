import { centralRequest } from "@/lib/axios";

/** @returns {Promise<unknown[]>} */
export async function fetchCentralPermissionCatalog() {
  const data = await centralRequest("GET", "permissions");
  return Array.isArray(data) ? data : [];
}

/**
 * Role picker for the matrix screen (permissions.view, not roles.view).
 * @returns {Promise<unknown[]>}
 */
export async function fetchCentralPermissionRoles() {
  const data = await centralRequest("GET", "permissions/roles");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} roleId
 * @returns {Promise<unknown>}
 */
export function fetchCentralRolePermissions(roleId) {
  return centralRequest("GET", `roles/${roleId}/permissions`);
}

/**
 * @param {number | string} roleId
 * @param {Array<Record<string, unknown>>} permissions
 * @returns {Promise<unknown>}
 */
export function updateCentralRolePermissions(roleId, permissions) {
  return centralRequest("PUT", `roles/${roleId}/permissions`, { permissions });
}
