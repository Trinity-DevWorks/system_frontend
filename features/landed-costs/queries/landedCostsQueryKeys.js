/**
 * Landed cost cache keys.
 *
 * The list key holds the paginated table pages; read and write them through
 * `@/lib/tables/tenantListCache`, never directly.
 */

export const LANDED_COSTS_LIST_QUERY_KEY = /** @type {const} */ (["tenant", "landed-costs"]);

/** Detail entries live under the list key so a list invalidation refreshes them too. */
export const LANDED_COST_DETAIL_QUERY_PREFIX = /** @type {const} */ ([...LANDED_COSTS_LIST_QUERY_KEY, "detail"]);

/** Receipts and open charges a landed cost can pick from. */
export const LANDED_COST_SOURCES_QUERY_KEY = /** @type {const} */ ([...LANDED_COSTS_LIST_QUERY_KEY, "sources"]);

/** @param {string} id */
export function landedCostDetailQueryKey(id) {
  return [...LANDED_COST_DETAIL_QUERY_PREFIX, id];
}
