"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { fetchSalesmen } from "../api/salesmen.api";
import { getSalesmanStatusLabel } from "../components/SalesmanTable/getSalesmanTableColumns";
import { SALESMEN_LIST_QUERY_KEY } from "./salesmenQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useSalesmenTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: SALESMEN_LIST_QUERY_KEY,
    queryFn: fetchSalesmen,
    tableId: "salesmen",
    t,
    tApiErrors,
    notification,
  });

  const tableData = useMemo(
    () =>
      table.rows.map((row) => ({
        ...row,
        is_active_label: getSalesmanStatusLabel(row?.is_active, t),
      })),
    [table.rows, t],
  );

  return {
    tableData,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
