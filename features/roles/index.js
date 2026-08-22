/**
 * Public API of the roles feature.
 *
 * Code inside `features/roles/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/roles/page.js`) imports `pages/RolesPage` directly.
 */

export * from "./api/roles.api";
export * from "./queries/rolesQueryKeys";
export * from "./utils/roleDrawerUtils";
