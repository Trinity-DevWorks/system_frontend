/**
 * Shared by the paginated table and the `?section=names` lookup (variant picker),
 * like the other catalog lists. Use `@/lib/tables/tenantListCache` to patch it.
 */
export const ITEM_ATTRIBUTES_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "item-attributes"]);

/** @param {number | string} id */
export function itemAttributeDetailQueryKey(id) {
  return [...ITEM_ATTRIBUTES_LIST_QUERY_KEY, id];
}
