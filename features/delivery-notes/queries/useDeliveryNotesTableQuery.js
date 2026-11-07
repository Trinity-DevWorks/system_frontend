"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getDeliveryNoteStatusLabel } from "../components/DeliveryNoteTable/getDeliveryNoteTableColumns";
import { fetchDeliveryNotes } from "../api/deliveryNotes.api";
import { DELIVERY_NOTES_LIST_QUERY_KEY } from "./deliveryNotesQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useDeliveryNotesTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: DELIVERY_NOTES_LIST_QUERY_KEY,
    queryFn: fetchDeliveryNotes,
    tableId: "delivery-notes",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getDeliveryNoteStatusLabel(row?.is_active, t),
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
