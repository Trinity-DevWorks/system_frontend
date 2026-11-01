"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { fetchItemAttributesPage } from "../api/itemAttributes.api";
import { ITEM_ATTRIBUTES_LIST_QUERY_KEY } from "./itemAttributesQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useItemAttributesTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: ITEM_ATTRIBUTES_LIST_QUERY_KEY,
    queryFn: fetchItemAttributesPage,
    tableId: "itemAttributes",
    t,
    tApiErrors,
    notification,
  });

  return {
    tableData: table.rows,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
