export const STOCK_BALANCES_QUERY_KEY = ["tenant", "stock", "balances"];

export const STOCK_MOVEMENTS_QUERY_KEY = ["tenant", "stock", "movements"];

export const STOCK_TRANSFERS_QUERY_KEY = ["tenant", "stock", "transfers"];

export const PURCHASE_ORDERS_QUERY_KEY = ["tenant", "stock", "purchase-orders"];

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
}
