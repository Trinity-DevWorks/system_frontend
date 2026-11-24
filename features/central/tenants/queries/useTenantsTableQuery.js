"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { fetchCentralTenants } from "../api/tenants.api";
import { CENTRAL_TENANTS_LIST_QUERY_KEY } from "./tenantsQueryKeys";

/**
 * @param {{
 *   status: string | null;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useTenantsTableQuery({ status, t, tApiErrors, notification }) {
  const extraParams = useMemo(() => (status ? { status } : {}), [status]);

  const table = useTenantPaginatedTable({
    queryKey: CENTRAL_TENANTS_LIST_QUERY_KEY,
    queryFn: fetchCentralTenants,
    extraParams,
    tableId: "central-tenants",
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
