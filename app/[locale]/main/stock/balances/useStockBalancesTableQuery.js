/**
 * Stock balances list query with server-side filters and pagination.
 *
 * Used by:
 * - app/[locale]/main/stock/balances/page.js
 */

import { STOCK_BALANCES_QUERY_KEY } from "@/components/stock/stockQueryCache";
import { fetchStockBalances } from "@/services/stockApi";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   warehouseId?: number;
 *   onlyWithStock: boolean;
 * }} args
 */
export function useStockBalancesTableQuery({
  t,
  tApiErrors,
  notification,
  warehouseId,
  onlyWithStock,
}) {
  const extraParams = useMemo(
    () => ({
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(onlyWithStock ? { only_with_stock: true } : {}),
    }),
    [warehouseId, onlyWithStock],
  );

  const table = useTenantPaginatedTable({
    queryKey: STOCK_BALANCES_QUERY_KEY,
    queryFn: fetchStockBalances,
    extraParams,
    staleTime: 60_000,
    tableId: "stock-balances",
    t,
    tApiErrors,
    notification,
  });

  return {
    tableData: table.rows,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    queryKey: [...STOCK_BALANCES_QUERY_KEY, extraParams],
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
