/**
 * Public API of the unit-groups feature.
 *
 * Code inside `features/unit-groups/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/unit-groups/page.js`) imports `pages/UnitGroupsPage` directly.
 */

export * from "./api/unitGroups.api";
export * from "./queries/unitGroupsQueryKeys";
