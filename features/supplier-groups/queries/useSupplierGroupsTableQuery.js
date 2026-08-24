"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getSupplierGroupStatusLabel } from "../components/SupplierGroupTable/getSupplierGroupTableColumns";
import { fetchSupplierGroups } from "../api/supplierGroups.api";
import { SUPPLIER_GROUPS_LIST_QUERY_KEY } from "./supplierGroupsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useSupplierGroupsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: SUPPLIER_GROUPS_LIST_QUERY_KEY,
    queryFn: fetchSupplierGroups,
    tableId: "supplier-groups",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getSupplierGroupStatusLabel(row?.is_active, t),
      })),
    [rows, t],
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
