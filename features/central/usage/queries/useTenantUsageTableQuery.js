"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { fetchCentralTenantUsage } from "../api/usage.api";
import { CENTRAL_TENANT_USAGE_QUERY_KEY } from "./usageQueryKeys";

/**
 * @param {{
 *   status: string | null;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useTenantUsageTableQuery({ status, t, tApiErrors, notification }) {
  const extraParams = useMemo(() => (status ? { status } : {}), [status]);

  const table = useTenantPaginatedTable({
    queryKey: CENTRAL_TENANT_USAGE_QUERY_KEY,
    queryFn: fetchCentralTenantUsage,
    extraParams,
    tableId: "central-tenant-usage",
    staleTime: QUERY_STALE_TIME.default,
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
