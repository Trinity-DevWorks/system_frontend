/**
 * Central plan cache keys.
 *
 * The list key is shared by the paginated table and the `?section=names` lookup,
 * so entries under it hold either a `{ rows, total }` page or a bare array.
 * Read and write them through `@/lib/tables/tenantListCache`, never directly.
 */

export const CENTRAL_PLANS_LIST_QUERY_KEY = /** @type {const} */ (["central", "plans"]);

/** `?section=names` lookup used by the tenant plan selects. */
export const CENTRAL_PLAN_NAMES_QUERY_KEY = /** @type {const} */ ([...CENTRAL_PLANS_LIST_QUERY_KEY, "names"]);

/** @param {number | string} id */
export function centralPlanDetailQueryKey(id) {
  return [...CENTRAL_PLANS_LIST_QUERY_KEY, id];
}
