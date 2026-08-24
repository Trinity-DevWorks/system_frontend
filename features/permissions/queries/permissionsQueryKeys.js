/**
 * Permission-administration cache keys (the matrix editor screen).
 *
 * Distinct from `PERMISSIONS_QUERY_KEY` in `@/lib/permissions`, which caches the
 * signed-in user's own matrix under `["tenant", "auth", "permissions"]`. This
 * prefix holds the catalog and per-role grids the admin screen edits.
 */

export const PERMISSIONS_ADMIN_QUERY_KEY = /** @type {const} */ (["tenant", "permissions"]);

export const PERMISSIONS_CATALOG_QUERY_KEY = /** @type {const} */ ([
  "tenant",
  "permissions",
  "catalog",
]);

export const PERMISSIONS_ROLES_QUERY_KEY = /** @type {const} */ ([
  "tenant",
  "permissions",
  "roles",
]);

/** @param {number | string} roleId */
export function permissionsRoleQueryKey(roleId) {
  return [...PERMISSIONS_ADMIN_QUERY_KEY, "role", roleId];
}
