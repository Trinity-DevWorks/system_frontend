/** Tenant home figures (`GET overview`). Pair with the active branch id when observing. */
export const OVERVIEW_QUERY_KEY = /** @type {const} */ (["tenant", "overview"]);

/** @param {number | null | undefined} branchId */
export function overviewQueryKey(branchId) {
  return [...OVERVIEW_QUERY_KEY, branchId ?? null];
}
