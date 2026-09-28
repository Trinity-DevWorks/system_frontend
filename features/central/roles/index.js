/**
 * Public API of the central roles feature.
 *
 * Code inside `features/central/roles/` imports siblings by relative path, not
 * through this barrel. The route entry (`app/[locale]/central/roles/page.js`)
 * imports `pages/CentralRolesPage` directly.
 */

export * from "./api/roles.api";
export * from "./queries/rolesQueryKeys";
export * from "./utils/roleDrawerUtils";
