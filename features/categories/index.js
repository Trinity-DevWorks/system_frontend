/**
 * Public API of the categories feature.
 *
 * Code inside `features/categories/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/categories/page.js`) imports `pages/CategoriesPage` directly.
 */

export * from "./api/categories.api";
export * from "./queries/categoriesQueryKeys";
export * from "./utils/categoryTree";
