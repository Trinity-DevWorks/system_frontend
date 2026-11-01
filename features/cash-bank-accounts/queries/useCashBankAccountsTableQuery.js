"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getCashBankAccountStatusLabel } from "../components/CashBankAccountTable/getCashBankAccountTableColumns";
import { fetchCashBankAccounts } from "../api/cashBankAccounts.api";
import { CASH_BANK_ACCOUNTS_LIST_QUERY_KEY } from "./cashBankAccountsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useCashBankAccountsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: CASH_BANK_ACCOUNTS_LIST_QUERY_KEY,
    queryFn: fetchCashBankAccounts,
    tableId: "cash-bank-accounts",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getCashBankAccountStatusLabel(row?.is_active, t),
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
