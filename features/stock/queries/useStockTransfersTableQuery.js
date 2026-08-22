/**
 * Stock transfers list query with server-side filters and pagination.
 */

import { STOCK_TRANSFERS_QUERY_KEY } from "./stockQueryKeys";
import { fetchStockTransfers } from "../api/stockTransfers.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   status?: string;
 *   fromWarehouseId?: number;
 *   toWarehouseId?: number;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function useStockTransfersTableQuery({
  t,
  tApiErrors,
  notification,
  status,
  fromWarehouseId,
  toWarehouseId,
  from,
  to,
}) {
  const extraParams = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(fromWarehouseId != null ? { from_warehouse_id: fromWarehouseId } : {}),
      ...(toWarehouseId != null ? { to_warehouse_id: toWarehouseId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [status, fromWarehouseId, toWarehouseId, from, to],
  );

  const table = useTenantPaginatedTable({
    queryKey: STOCK_TRANSFERS_QUERY_KEY,
    queryFn: fetchStockTransfers,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: 30_000,
    tableId: "stock-transfers",
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
