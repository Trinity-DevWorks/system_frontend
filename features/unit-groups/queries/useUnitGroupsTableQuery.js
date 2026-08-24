"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getUnitGroupDimensionTypeLabel, getUnitGroupStatusLabel } from "../components/UnitGroupTable/getUnitGroupTableColumns";
import { fetchUnitGroups } from "../api/unitGroups.api";
import { UNIT_GROUPS_LIST_QUERY_KEY } from "./unitGroupsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useUnitGroupsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: UNIT_GROUPS_LIST_QUERY_KEY,
    queryFn: fetchUnitGroups,
    tableId: "unit-groups",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        dimension_type_label: getUnitGroupDimensionTypeLabel(
          row?.dimension_type,
          t,
        ),
        is_active_label: getUnitGroupStatusLabel(row?.is_active, t),
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
