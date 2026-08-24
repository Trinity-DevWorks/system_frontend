/**
 * CustomerGroup cache keys.
 *
 * The list key is shared by the paginated table and the `?section=names` lookup,
 * so entries under it hold either a `{ rows, total }` page or a bare array.
 * Read and write them through `@/lib/tables/tenantListCache`, never directly.
 */

export const CUSTOMER_GROUPS_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "customer-groups"]);

/** @param {number | string} id */
export function customerGroupDetailQueryKey(id) {
  return [...CUSTOMER_GROUPS_LIST_QUERY_KEY, id];
}
