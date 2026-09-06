/**
 * Sales invoices list query with server-side filters and pagination.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { SALES_INVOICES_QUERY_KEY } from "./salesInvoicesQueryKeys";
import { fetchSalesInvoices } from "../api/salesInvoices.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   status?: string;
 *   customerId?: string;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function useSalesInvoicesTableQuery({
  t,
  tApiErrors,
  notification,
  status,
  customerId,
  from,
  to,
}) {
  const extraParams = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(customerId ? { customer_id: customerId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [status, customerId, from, to],
  );

  const table = useTenantPaginatedTable({
    queryKey: SALES_INVOICES_QUERY_KEY,
    queryFn: fetchSalesInvoices,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.ledger,
    tableId: "sales-invoices",
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
