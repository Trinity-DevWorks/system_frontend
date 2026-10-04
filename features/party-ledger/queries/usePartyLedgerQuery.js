"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { useServerTablePagination } from "@/lib/tables/useServerTablePagination";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { fetchPartyLedger } from "../api/partyLedger.api";

/**
 * @param {{
 *   queryKey: readonly unknown[];
 *   endpoint: string | null;
 *   tableId: string;
 *   currencyId?: number;
 *   dateFrom?: string;
 *   dateTo?: string;
 *   enabled: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function usePartyLedgerQuery({
  queryKey,
  endpoint,
  tableId,
  currencyId,
  dateFrom,
  dateTo,
  enabled,
  t,
  tApiErrors,
  notification,
}) {
  const { page, perPage, onPageChange, resetPage } = useServerTablePagination({
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    tableId,
  });

  const filterKey = useMemo(
    () => JSON.stringify({ endpoint, currencyId, dateFrom, dateTo }),
    [endpoint, currencyId, dateFrom, dateTo],
  );

  useEffect(() => {
    resetPage();
  }, [filterKey, resetPage]);

  const params = useMemo(
    () => ({
      page,
      per_page: perPage,
      currency_id: currencyId,
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }),
    [page, perPage, currencyId, dateFrom, dateTo],
  );

  const query = useQuery({
    queryKey: [...queryKey, endpoint, params],
    queryFn: () => fetchPartyLedger(/** @type {string} */ (endpoint), params),
    enabled: enabled && endpoint != null,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  useEffect(() => {
    if (!enabled || !query.isError || !query.error) return;
    notification.error({
      title: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, query.error),
    });
  }, [enabled, query.isError, query.error, notification, t, tApiErrors]);

  const summary = query.data?.summary ?? null;
  const summaries = query.data?.summaries ?? [];

  return {
    rows: query.data?.rows ?? [],
    summary,
    summaries,
    isPending: enabled && query.isPending,
    isFetching: enabled && query.isFetching,
    refetch: query.refetch,
    pagination: {
      mode: "server",
      current: page,
      pageSize: perPage,
      total: query.data?.total ?? 0,
      pageSizeOptions: [10, 25, 50, 100],
      onPageChange,
      summaryRange:
        query.data?.from != null && query.data?.to != null
          ? { start: query.data.from, end: query.data.to, total: query.data.total }
          : query.data?.total === 0
            ? null
            : undefined,
    },
  };
}
