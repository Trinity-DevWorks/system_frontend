/**
 * suppliers cache keys.
 *
 * The list key is shared by the paginated table and the `?section=names` lookup,
 * so entries under it hold either a `{ rows, total }` page or a bare array.
 * Read and write them through `@/lib/tables/tenantListCache`, never directly.
 */

export const SUPPLIERS_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "suppliers"]);

export const SUPPLIER_ITEMS_QUERY_KEY = /** @type {const} */ (["tenant", "supplier-items"]);

/** @param {number | string} id */
export function supplierDetailQueryKey(id) {
  return [...SUPPLIERS_LIST_QUERY_KEY, id];
}

/** @param {number | string} supplierId */
export function supplierItemsBySupplierQueryKey(supplierId) {
  return [...SUPPLIER_ITEMS_QUERY_KEY, "by-supplier", supplierId];
}
