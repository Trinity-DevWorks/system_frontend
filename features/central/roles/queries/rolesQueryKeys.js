/**
 * Central role cache keys.
 *
 * The list key is shared by the paginated table and the `?section=names` lookup,
 * so entries under it hold either a `{ rows, total }` page or a bare array.
 * Read and write them through `@/lib/tables/tenantListCache`, never directly.
 */

export const CENTRAL_ROLES_LIST_QUERY_KEY = /** @type {const} */ (["central", "roles"]);

/** @param {number | string} id */
export function centralRoleDetailQueryKey(id) {
  return [...CENTRAL_ROLES_LIST_QUERY_KEY, id];
}
