"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { fetchCustomers } from "../api/customers.api";
import { getCustomerStatusLabel } from "../components/CustomerTable/getCustomerTableColumns";
import { CUSTOMERS_LIST_QUERY_KEY } from "./customersQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useCustomersTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: CUSTOMERS_LIST_QUERY_KEY,
    queryFn: fetchCustomers,
    tableId: "customers",
    t,
    tApiErrors,
    notification,
  });

  const tableData = useMemo(
    () =>
      table.rows.map((row) => ({
        ...row,
        status_label: getCustomerStatusLabel(row?.status, t),
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
