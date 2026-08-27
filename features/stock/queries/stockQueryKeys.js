export const STOCK_BALANCES_QUERY_KEY = ["tenant", "stock", "balances"];

export const STOCK_LOTS_QUERY_KEY = ["tenant", "stock", "lots"];

export const STOCK_INVENTORY_LOTS_QUERY_KEY = ["tenant", "stock", "inventory-lots"];

/**
 * @param {number | string | null | undefined} itemId
 * @param {number | null | undefined} [warehouseId]
 */
export function stockLotsQueryKey(itemId, warehouseId = null) {
  return [...STOCK_LOTS_QUERY_KEY, itemId ?? null, warehouseId ?? null];
}

export const STOCK_MOVEMENTS_QUERY_KEY = ["tenant", "stock", "movements"];

export const STOCK_TRANSFERS_QUERY_KEY = ["tenant", "stock", "transfers"];

export const PURCHASE_ORDERS_QUERY_KEY = ["tenant", "stock", "purchase-orders"];

export const GOODS_RECEIPTS_QUERY_KEY = ["tenant", "stock", "goods-receipts"];

export const GOODS_RECEIPT_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "goods-receipt",
]);

export const OPENING_STOCKS_QUERY_KEY = ["tenant", "stock", "opening-stocks"];

export const OPENING_STOCK_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "opening-stock",
]);

export const STOCK_ADJUSTMENTS_QUERY_KEY = ["tenant", "stock", "adjustments"];

export const STOCK_ADJUSTMENT_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "adjustment",
]);

export const STOCK_ADJUSTMENT_REASONS_QUERY_KEY = ["tenant", "stock", "adjustment-reasons"];

export const STOCK_ADJUSTMENT_REASON_NAMES_QUERY_KEY = [
  "tenant",
  "stock",
  "adjustment-reasons",
  "names",
];

export const STOCK_ADJUSTMENT_REASON_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "adjustment-reason",
]);

export const PRODUCTIONS_QUERY_KEY = ["tenant", "stock", "productions"];

export const PRODUCTION_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "production",
]);

export const BUNDLE_EXPLOSIONS_QUERY_KEY = ["tenant", "stock", "bundle-explosions"];

export const BUNDLE_EXPLOSION_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "bundle-explosion",
]);

export const STOCK_COUNTS_QUERY_KEY = ["tenant", "stock", "stock-counts"];

export const STOCK_COUNT_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "stock-count",
]);

export const PURCHASE_ORDER_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "purchase-order",
]);

export const STOCK_TRANSFER_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "transfer",
]);

export const STOCK_MOVEMENT_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "movement",
]);

export const PURCHASING_ALERTS_QUERY_KEY = ["tenant", "stock", "purchasing-alerts"];

export const PURCHASING_ALERTS_SUMMARY_QUERY_KEY = [
  "tenant",
  "stock",
  "purchasing-alerts",
  "summary",
];

export const PURCHASING_ALERT_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "stock",
  "purchasing-alert",
]);

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 */
export function invalidatePurchasingAlertsQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: PURCHASING_ALERTS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: PURCHASING_ALERTS_SUMMARY_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: PURCHASING_ALERT_DETAIL_QUERY_PREFIX });
}
