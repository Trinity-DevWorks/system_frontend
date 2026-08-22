/**
 * Public API of the salesmen feature.
 *
 * Code inside `features/salesmen/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/salesmen/page.js`) imports `pages/SalesmenPage` directly.
 */

export * from "./api/salesmen.api";
export * from "./api/salesmenAttachments.api";
export * from "./queries/salesmenQueryKeys";
