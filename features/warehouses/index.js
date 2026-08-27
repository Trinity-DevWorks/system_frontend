/**
 * Public API of the warehouses feature.
 *
 * Code inside `features/warehouses/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/warehouses/page.js`) imports `pages/WarehousesPage` directly.
 */

export * from "./api/warehouses.api";
export * from "./queries/warehousesQueryKeys";
