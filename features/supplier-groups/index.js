/**
 * Public API of the supplier-groups feature.
 *
 * Code inside `features/supplier-groups/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/supplier-groups/page.js`) imports `pages/SupplierGroupsPage` directly.
 */

export * from "./api/supplierGroups.api";
export * from "./queries/supplierGroupsQueryKeys";
