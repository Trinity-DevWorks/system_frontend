/**
 * Public API of the central tenants feature.
 *
 * Code inside `features/central/tenants/` imports siblings by relative path, not
 * through this barrel. The route entry (`app/[locale]/central/tenants/page.js`)
 * imports `pages/TenantsPage` directly.
 */

export * from "./api/tenants.api";
export * from "./queries/tenantsQueryKeys";
export * from "./utils/tenantDrawerUtils";
