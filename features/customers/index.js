/**
 * Public API of the customers feature.
 *
 * Code inside `features/customers/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/customers/page.js`) imports `pages/CustomersPage` directly.
 */

export * from "./api/customers.api";
export * from "./api/customersAttachments.api";
export * from "./queries/customersQueryKeys";
