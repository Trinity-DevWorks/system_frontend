"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getExpenseVoucherStatusLabel } from "../components/ExpenseVoucherTable/getExpenseVoucherTableColumns";
import { fetchExpenseVouchers } from "../api/expenseVouchers.api";
import { EXPENSE_VOUCHERS_LIST_QUERY_KEY } from "./expenseVouchersQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useExpenseVouchersTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: EXPENSE_VOUCHERS_LIST_QUERY_KEY,
    queryFn: fetchExpenseVouchers,
    tableId: "expense-vouchers",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getExpenseVoucherStatusLabel(row?.is_active, t),
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
