import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { PURCHASE_INVOICES_QUERY_KEY } from "./purchaseInvoiceQueryKeys";
import { fetchPurchaseInvoices } from "../api/purchaseInvoices.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   status?: string;
 *   supplierId?: string;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function usePurchaseInvoicesTableQuery({
  t,
  tApiErrors,
  notification,
  status,
  supplierId,
  from,
  to,
}) {
  const extraParams = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(supplierId ? { supplier_id: supplierId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [status, supplierId, from, to],
  );

  const table = useTenantPaginatedTable({
    queryKey: PURCHASE_INVOICES_QUERY_KEY,
    queryFn: fetchPurchaseInvoices,
    extraParams,
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    staleTime: QUERY_STALE_TIME.ledger,
    tableId: "purchase-invoices",
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
