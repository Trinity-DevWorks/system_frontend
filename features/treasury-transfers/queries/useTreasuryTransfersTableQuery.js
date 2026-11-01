"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getTreasuryTransferStatusLabel } from "../components/TreasuryTransferTable/getTreasuryTransferTableColumns";
import { fetchTreasuryTransfers } from "../api/treasuryTransfers.api";
import { TREASURY_TRANSFERS_LIST_QUERY_KEY } from "./treasuryTransfersQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useTreasuryTransfersTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: TREASURY_TRANSFERS_LIST_QUERY_KEY,
    queryFn: fetchTreasuryTransfers,
    tableId: "treasury-transfers",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getTreasuryTransferStatusLabel(row?.is_active, t),
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
