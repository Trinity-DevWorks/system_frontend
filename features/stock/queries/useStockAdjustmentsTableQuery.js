/**
 * Stock adjustment list query with server-side filters and pagination.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { STOCK_ADJUSTMENTS_QUERY_KEY } from "./stockQueryKeys";
import { fetchStockAdjustments } from "../api/stockAdjustments.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   status?: string;
 *   warehouseId?: number;
 *   reasonId?: number;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function useStockAdjustmentsTableQuery({
  t,
  tApiErrors,
  notification,
  status,
  warehouseId,
  reasonId,
  from,
  to,
}) {
  const extraParams = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(reasonId != null ? { reason_id: reasonId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [status, warehouseId, reasonId, from, to],
  );

  const table = useTenantPaginatedTable({
    queryKey: STOCK_ADJUSTMENTS_QUERY_KEY,
    queryFn: fetchStockAdjustments,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.ledger,
    tableId: "stock-adjustments",
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
