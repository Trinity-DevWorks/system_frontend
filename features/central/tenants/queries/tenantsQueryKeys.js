/**
 * Central tenant cache keys.
 *
 * Paginated pages live under the list key (`["central", "tenants", { page, ... }]`);
 * read and write them through `@/lib/tables/tenantListCache`, never directly.
 */

export const CENTRAL_TENANTS_LIST_QUERY_KEY = /** @type {const} */ (["central", "tenants"]);

/** @param {string} id */
export function centralTenantDetailQueryKey(id) {
  return [...CENTRAL_TENANTS_LIST_QUERY_KEY, id];
}

/** @param {string} id */
export function centralTenantModulesQueryKey(id) {
  return [...CENTRAL_TENANTS_LIST_QUERY_KEY, id, "modules"];
}
