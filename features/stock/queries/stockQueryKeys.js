/** @typedef {{ warehouse_id?: number; item_id?: number; search?: string; only_with_stock?: boolean }} StockBalanceFilters */

/** @typedef {{ warehouse_id?: number; item_id?: number; type?: string; from?: string; to?: string; limit?: number }} StockMovementFilters */

/** @typedef {{ status?: string; from_warehouse_id?: number; to_warehouse_id?: number; search?: string; from?: string; to?: string; limit?: number }} StockTransferFilters */

/** @typedef {{ status?: string; supplier_id?: string; warehouse_id?: number; search?: string; from?: string; to?: string; limit?: number }} PurchaseOrderFilters */

export const STOCK_BALANCES_QUERY_KEY = ["tenant", "stock", "balances"];

/**
 * @param {StockBalanceFilters} [filters]
 */
export function stockBalancesQueryKey(filters = {}) {
  return [...STOCK_BALANCES_QUERY_KEY, filters];
}

export const STOCK_MOVEMENTS_QUERY_KEY = ["tenant", "stock", "movements"];

/**
 * @param {StockMovementFilters} [filters]
 */
export function stockMovementsQueryKey(filters = {}) {
  return [...STOCK_MOVEMENTS_QUERY_KEY, filters];
}

export const STOCK_TRANSFERS_QUERY_KEY = ["tenant", "stock", "transfers"];

/**
 * @param {StockTransferFilters} [filters]
 */
export function stockTransfersQueryKey(filters = {}) {
  return [...STOCK_TRANSFERS_QUERY_KEY, filters];
}

export const PURCHASE_ORDERS_QUERY_KEY = ["tenant", "stock", "purchase-orders"];

/**
 * @param {PurchaseOrderFilters} [filters]
 */
export function purchaseOrdersQueryKey(filters = {}) {
  return [...PURCHASE_ORDERS_QUERY_KEY, filters];
}

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

/** @typedef {{ warehouse_id?: number; item_id?: number; search?: string; status?: string; only_alerts?: boolean }} PurchasingAlertFilters */

export const PURCHASING_ALERTS_QUERY_KEY = ["tenant", "stock", "purchasing-alerts"];

/**
 * @param {PurchasingAlertFilters} [filters]
 */
export function purchasingAlertsQueryKey(filters = {}) {
  return [...PURCHASING_ALERTS_QUERY_KEY, filters];
}

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
