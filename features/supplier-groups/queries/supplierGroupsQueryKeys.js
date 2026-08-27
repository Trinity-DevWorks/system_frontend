/**
 * SupplierGroup cache keys.
 *
 * The list key is shared by the paginated table and the `?section=names` lookup,
 * so entries under it hold either a `{ rows, total }` page or a bare array.
 * Read and write them through `@/lib/tables/tenantListCache`, never directly.
 */

export const SUPPLIER_GROUPS_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "supplier-groups"]);

/** @param {number | string} id */
export function supplierGroupDetailQueryKey(id) {
  return [...SUPPLIER_GROUPS_LIST_QUERY_KEY, id];
}
