"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getPriceListStatusLabel } from "../components/PriceListTable/getPriceListTableColumns";
import { fetchPriceLists } from "../api/priceLists.api";
import { PRICE_LISTS_LIST_QUERY_KEY } from "./priceListsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function usePriceListsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: PRICE_LISTS_LIST_QUERY_KEY,
    queryFn: fetchPriceLists,
    tableId: "price-lists",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getPriceListStatusLabel(row?.is_active, t),
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
