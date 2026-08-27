"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getBranchDefaultLabel, getBranchStatusLabel } from "../components/BranchTable/getBranchTableColumns";
import { fetchBranches } from "../api/branches.api";
import { BRANCHES_LIST_QUERY_KEY } from "./branchesQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useBranchesTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: BRANCHES_LIST_QUERY_KEY,
    queryFn: fetchBranches,
    tableId: "branches",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getBranchStatusLabel(row?.is_active, t),
        is_default_label: getBranchDefaultLabel(row?.is_default, t),
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
