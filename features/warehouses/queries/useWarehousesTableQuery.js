"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getWarehouseDefaultLabel, getWarehouseStatusLabel } from "../components/WarehouseTable/getWarehouseTableColumns";
import { fetchWarehouses } from "../api/warehouses.api";
import { WAREHOUSES_LIST_QUERY_KEY } from "./warehousesQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useWarehousesTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouses,
    tableId: "warehouses",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getWarehouseStatusLabel(row?.is_active, t),
        is_default_label: getWarehouseDefaultLabel(row?.is_default, t),
        type_label: t(`type_${row?.type ?? "central"}`),
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
