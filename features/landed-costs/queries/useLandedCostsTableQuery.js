"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { fetchLandedCosts } from "../api/landedCosts.api";
import { LANDED_COSTS_LIST_QUERY_KEY } from "./landedCostsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useLandedCostsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: LANDED_COSTS_LIST_QUERY_KEY,
    queryFn: fetchLandedCosts,
    staleTime: QUERY_STALE_TIME.default,
    tableId: "landed-costs",
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
