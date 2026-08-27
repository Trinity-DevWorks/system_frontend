/**
 * Item cache keys.
 *
 * The list key is shared by the paginated table and the `?section=names` lookup,
 * so entries under it hold either a `{ rows, total }` page or a bare array.
 * Read and write them through `@/lib/tables/tenantListCache`, never directly.
 *
 * Sub-resources (attachments, uoms, barcodes, bundle, recipe, replenishment)
 * nest under the detail key so invalidating one item clears all of its panels.
 */

/** @type {readonly ["tenant", "items"]} */
export const ITEMS_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "items"]);

/** @param {number | string} id */
export function itemDetailQueryKey(id) {
  return [...ITEMS_LIST_QUERY_KEY, id];
}

export const ITEM_TYPES_QUERY_KEY = /** @type {const} */ (["tenant", "item-types"]);
