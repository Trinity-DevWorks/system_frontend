"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { fetchCentralRoles } from "../api/roles.api";
import { CENTRAL_ROLES_LIST_QUERY_KEY } from "./rolesQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useCentralRolesTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: CENTRAL_ROLES_LIST_QUERY_KEY,
    queryFn: fetchCentralRoles,
    tableId: "central-roles",
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
