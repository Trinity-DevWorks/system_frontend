"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";
import { getPaymentTermDefaultLabel, getPaymentTermStatusLabel } from "../components/PaymentTermTable/getPaymentTermTableColumns";
import { fetchPaymentTerms } from "../api/paymentTerms.api";
import { PAYMENT_TERMS_LIST_QUERY_KEY } from "./paymentTermsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function usePaymentTermsTableQuery({ t, tApiErrors, notification }) {
  const table = useTenantPaginatedTable({
    queryKey: PAYMENT_TERMS_LIST_QUERY_KEY,
    queryFn: fetchPaymentTerms,
    tableId: "payment-terms",
    t,
    tApiErrors,
    notification,
  });

  const { rows } = table;

  const tableData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        is_active_label: getPaymentTermStatusLabel(row?.is_active, t),
        is_default_label: getPaymentTermDefaultLabel(row?.is_default, t),
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
