/**
 * Opening stock list query with server-side filters and pagination.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { OPENING_STOCKS_QUERY_KEY } from "./stockQueryKeys";
import { fetchOpeningStocks } from "../api/openingStocks.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   status?: string;
 *   warehouseId?: number;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function useOpeningStocksTableQuery({
  t,
  tApiErrors,
  notification,
  status,
  warehouseId,
  from,
  to,
}) {
  const extraParams = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [status, warehouseId, from, to],
  );

  const table = useTenantPaginatedTable({
    queryKey: OPENING_STOCKS_QUERY_KEY,
    queryFn: fetchOpeningStocks,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.ledger,
    tableId: "opening-stocks",
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
