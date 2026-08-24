/**
 * Brand cache keys.
 *
 * The list key is shared by the paginated table and the `?section=names` lookup,
 * so entries under it hold either a `{ rows, total }` page or a bare array.
 * Read and write them through `@/lib/tables/tenantListCache`, never directly.
 */

export const BRANDS_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "brands"]);

/** @param {number | string} id */
export function brandDetailQueryKey(id) {
  return [...BRANDS_LIST_QUERY_KEY, id];
}
