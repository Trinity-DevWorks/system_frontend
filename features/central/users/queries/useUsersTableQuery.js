"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { fetchCentralUsers } from "../api/users.api";
import { CENTRAL_USERS_LIST_QUERY_KEY } from "./usersQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useCentralUsersTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: CENTRAL_USERS_LIST_QUERY_KEY,
    queryFn: fetchCentralUsers,
    tableId: "central-users",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        role_name: typeof row?.role?.name === "string" ? row.role.name.trim() : "",
      })),
    [rows],
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
