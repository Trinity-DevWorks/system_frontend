/**
 * Inventory lots inquiry list with server-side filters and pagination.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { STOCK_INVENTORY_LOTS_QUERY_KEY } from "./stockQueryKeys";
import { fetchInventoryLots } from "../api/stock.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   warehouseId?: number;
 *   expired: boolean;
 *   missingExpiry: boolean;
 *   onlyWithStock: boolean;
 * }} args
 */
export function useInventoryLotsTableQuery({
  t,
  tApiErrors,
  notification,
  warehouseId,
  expired,
  missingExpiry,
  onlyWithStock,
}) {
  const extraParams = useMemo(
    () => ({
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(expired ? { expired: true } : {}),
      ...(missingExpiry ? { missing_expiry: true } : {}),
      ...(onlyWithStock ? { only_with_stock: true } : {}),
    }),
    [warehouseId, expired, missingExpiry, onlyWithStock],
  );

  const table = useTenantPaginatedTable({
    queryKey: STOCK_INVENTORY_LOTS_QUERY_KEY,
    queryFn: fetchInventoryLots,
    extraParams,
    staleTime: QUERY_STALE_TIME.default,
    tableId: "stock-inventory-lots",
    t,
    tApiErrors,
    notification,
  });

  return {
    tableData: table.rows,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    queryKey: [...STOCK_INVENTORY_LOTS_QUERY_KEY, extraParams],
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
