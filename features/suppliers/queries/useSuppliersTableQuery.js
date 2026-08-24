"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { fetchSuppliers } from "../api/suppliers.api";
import { getSupplierStatusLabel } from "../components/SupplierTable/getSupplierTableColumns";
import { SUPPLIERS_LIST_QUERY_KEY } from "./suppliersQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useSuppliersTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    queryFn: fetchSuppliers,
    tableId: "suppliers",
    t,
    tApiErrors,
    notification,
  });

  const tableData = useMemo(
    () =>
      table.rows.map((row) => ({
        ...row,
        is_active_label: getSupplierStatusLabel(row?.is_active, t),
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
