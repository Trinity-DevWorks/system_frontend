/**
 * Public API of the vat-groups feature.
 *
 * Code inside `features/vat-groups/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/vat-groups/page.js`) imports `pages/VatGroupsPage` directly.
 */

export * from "./api/vatGroups.api";
export * from "./queries/vatGroupsQueryKeys";
