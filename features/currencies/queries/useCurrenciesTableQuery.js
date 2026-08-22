"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { fetchCurrencies } from "../api/currencies.api";
import { CURRENCIES_LIST_QUERY_KEY } from "./currenciesQueryKeys";

/**
 * Currency rows are rendered as-is; the table needs no derived label columns.
 *
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useCurrenciesTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencies,
    tableId: "currencies",
    t,
    tApiErrors,
    notification,
  });

  return {
    rows: table.rows,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
