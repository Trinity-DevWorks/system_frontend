/**
 * Purchase orders list query with server-side filters and pagination.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { PURCHASE_ORDERS_QUERY_KEY } from "./stockQueryKeys";
import { fetchPurchaseOrders } from "../api/purchaseOrders.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   status?: string;
 *   supplierId?: string;
 *   warehouseId?: number;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function usePurchaseOrdersTableQuery({
  t,
  tApiErrors,
  notification,
  status,
  supplierId,
  warehouseId,
  from,
  to,
}) {
  const extraParams = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(supplierId ? { supplier_id: supplierId } : {}),
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [status, supplierId, warehouseId, from, to],
  );

  const table = useTenantPaginatedTable({
    queryKey: PURCHASE_ORDERS_QUERY_KEY,
    queryFn: fetchPurchaseOrders,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.ledger,
    tableId: "purchase-orders",
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
