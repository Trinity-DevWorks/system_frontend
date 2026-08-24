/**
 * Public API of the customer-groups feature.
 *
 * Code inside `features/customer-groups/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/customer-groups/page.js`) imports `pages/CustomerGroupsPage` directly.
 */

export * from "./api/customerGroups.api";
export * from "./queries/customerGroupsQueryKeys";
