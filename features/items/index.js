/**
 * Public API of the items feature.
 *
 * Code inside `features/items/` imports siblings by relative path, not through
 * this barrel, so the feature stays free of import cycles. The route entry
 * (`app/[locale]/main/items/page.js`) imports `pages/ItemsPage` directly.
 */

export * from "./api/items.api";
export * from "./api/itemUoms.api";
export * from "./api/itemTypes.api";
export * from "./api/itemBarcodes.api";
export * from "./api/supplierItems.api";
export * from "./queries/itemsQueryKeys";
