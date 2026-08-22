/**
 * Currency cache keys.
 *
 * The list key is shared by the paginated table and the `?section=names` lookup,
 * so entries under it hold either a `{ rows, total }` page or a bare array.
 * Read and write them through `@/lib/tables/tenantListCache`, never directly.
 */

export const CURRENCIES_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "currencies"]);

/** @param {number | string} id */
export function currencyDetailQueryKey(id) {
  return [...CURRENCIES_LIST_QUERY_KEY, id];
}
