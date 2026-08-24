"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getUserStatusLabel } from "../components/UserTable/getUserTableColumns";
import { fetchTenantUsers } from "../api/tenantUsers.api";
import { USERS_LIST_QUERY_KEY } from "./tenantUsersQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useUsersTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: USERS_LIST_QUERY_KEY,
    queryFn: fetchTenantUsers,
    tableId: "users",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => {
        const branches = Array.isArray(row?.branches) ? row.branches : [];
        const roleNames = [
          ...new Set(
            branches
              .map((branch) => {
                if (typeof branch?.role?.name === "string" && branch.role.name.trim()) {
                  return branch.role.name.trim();
                }
                return "";
              })
              .filter(Boolean),
          ),
        ];
        const sharedRoleName =
          typeof row?.role?.name === "string" && row.role.name.trim() ? row.role.name.trim() : "";

        return {
          ...row,
          role_name: sharedRoleName || (roleNames.length > 0 ? roleNames.join(", ") : ""),
          branches_label: branches
            .map((branch) => {
              const name = typeof branch?.name === "string" ? branch.name.trim() : "";
              const roleName = typeof branch?.role?.name === "string" ? branch.role.name.trim() : "";
              if (!name) return "";
              return roleName ? `${name} (${roleName})` : name;
            })
            .filter(Boolean)
            .join(", "),
          active_label: getUserStatusLabel(row?.is_active, t),
        };
      }),
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
