"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getCustomerGroupStatusLabel } from "../components/CustomerGroupTable/getCustomerGroupTableColumns";
import { fetchCustomerGroups } from "../api/customerGroups.api";
import { CUSTOMER_GROUPS_LIST_QUERY_KEY } from "./customerGroupsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useCustomerGroupsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: CUSTOMER_GROUPS_LIST_QUERY_KEY,
    queryFn: fetchCustomerGroups,
    tableId: "customer-groups",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getCustomerGroupStatusLabel(row?.is_active, t),
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
