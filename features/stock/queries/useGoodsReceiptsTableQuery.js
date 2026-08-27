/**
 * Goods receipts list query with server-side filters and pagination.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { GOODS_RECEIPTS_QUERY_KEY } from "./stockQueryKeys";
import { fetchGoodsReceipts } from "../api/goodsReceipts.api";
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
export function useGoodsReceiptsTableQuery({
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
    queryKey: GOODS_RECEIPTS_QUERY_KEY,
    queryFn: fetchGoodsReceipts,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.ledger,
    tableId: "goods-receipts",
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
