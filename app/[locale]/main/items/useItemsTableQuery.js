/**
 * Items list query with server-side pagination and search.
 *
 * Used by:
 * - app/[locale]/main/items/page.js
 */

import { ITEMS_LIST_QUERY_KEY } from "@/components/items/itemsQueryCache";
import { getItemTypeLabel } from "@/services/itemTypesApi";
import { fetchItems } from "@/services/itemsApi";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getItemStatusLabel } from "./getItemTableColumns";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useItemsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItems,
    staleTime: 2 * 60_000,
    tableId: "items",
    t,
    tApiErrors,
    notification,
  });

  const tableData = useMemo(
    () =>
      table.rows.map((row) => ({
        ...row,
        is_active_label: getItemStatusLabel(row?.is_active, t),
        item_type_label: getItemTypeLabel(row?.item_type),
      })),
    [table.rows, t],
  );

  return {
    tableData,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    handleRefresh: table.refetch,
    refreshFetching: table.isFetching,
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
