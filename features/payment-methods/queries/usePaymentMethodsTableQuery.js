"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getPaymentMethodDefaultLabel, getPaymentMethodStatusLabel, getPaymentMethodTypeLabel } from "../components/PaymentMethodTable/getPaymentMethodTableColumns";
import { fetchPaymentMethods } from "../api/paymentMethods.api";
import { PAYMENT_METHODS_LIST_QUERY_KEY } from "./paymentMethodsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function usePaymentMethodsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: PAYMENT_METHODS_LIST_QUERY_KEY,
    queryFn: fetchPaymentMethods,
    tableId: "payment-methods",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getPaymentMethodStatusLabel(row?.is_active, t),
        is_default_label: getPaymentMethodDefaultLabel(row?.is_default, t),
        type_label: getPaymentMethodTypeLabel(row?.type, t),
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
