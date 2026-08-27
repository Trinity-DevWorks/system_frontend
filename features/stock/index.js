/**
 * Public API of the stock feature.
 *
 * Code inside `features/stock/` imports siblings by relative path, not through
 * this barrel. Route entries under `app/[locale]/main/stock/` import their page
 * from `pages/` directly.
 *
 * The query keys are re-exported because other features invalidate stock
 * caches after mutations. The quantity formatters are re-exported
 * because the item drawer renders stock figures.
 */

export * from "./api/stock.api";
export * from "./api/stockTransfers.api";
export * from "./api/purchaseOrders.api";
export * from "./api/goodsReceipts.api";
export * from "./api/openingStocks.api";
export * from "./api/stockAdjustments.api";
export * from "./api/stockAdjustmentReasons.api";
export * from "./api/productions.api";
export * from "./api/bundleExplosions.api";
export * from "./api/purchasingAlerts.api";
export * from "./queries/stockQueryKeys";
export * from "./utils/formatStockQuantity";
