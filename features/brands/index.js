/**
 * Public API of the brands feature.
 *
 * Code inside `features/brands/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/brands/page.js`) imports `pages/BrandsPage` directly.
 */

export * from "./api/brands.api";
export * from "./queries/brandsQueryKeys";
