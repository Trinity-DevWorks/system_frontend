/**
 * Central permission-administration cache keys (the matrix editor screen).
 *
 * Distinct from the signed-in admin's own matrix, which lives on
 * `CENTRAL_AUTH_ME_QUERY_KEY`.
 */

export const CENTRAL_PERMISSIONS_ADMIN_QUERY_KEY = /** @type {const} */ (["central", "permissions"]);

export const CENTRAL_PERMISSIONS_CATALOG_QUERY_KEY = /** @type {const} */ ([
  "central",
  "permissions",
  "catalog",
]);

export const CENTRAL_PERMISSIONS_ROLES_QUERY_KEY = /** @type {const} */ ([
  "central",
  "permissions",
  "roles",
]);

/** @param {number | string} roleId */
export function centralPermissionsRoleQueryKey(roleId) {
  return [...CENTRAL_PERMISSIONS_ADMIN_QUERY_KEY, "role", roleId];
}
