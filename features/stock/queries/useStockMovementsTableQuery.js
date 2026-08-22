/**
 * Stock movements list query with server-side filters and pagination.
 *
 * Used by:
 * - app/[locale]/main/stock/movements/page.js
 */

import { STOCK_MOVEMENTS_QUERY_KEY } from "./stockQueryKeys";
import { fetchStockMovements } from "../api/stock.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   warehouseId?: number;
 *   movementType?: string;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function useStockMovementsTableQuery({
  t,
  tApiErrors,
  notification,
  warehouseId,
  movementType,
  from,
  to,
}) {
  const extraParams = useMemo(
    () => ({
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(movementType ? { type: movementType } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [warehouseId, movementType, from, to],
  );

  const table = useTenantPaginatedTable({
    queryKey: STOCK_MOVEMENTS_QUERY_KEY,
    queryFn: fetchStockMovements,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: 30_000,
    tableId: "stock-movements",
    t,
    tApiErrors,
    notification,
  });

  return {
    tableData: table.rows,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
