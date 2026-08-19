"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { DEFAULT_PAGE_SIZE_OPTIONS, MAX_PAGE_SIZE } from "@/lib/tables/paginatedList";
import { useServerTablePagination } from "@/lib/tables/useServerTablePagination";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

/**
 * Server-paginated tenant list query with search, page state, and load-error toast.
 *
 * @param {{
 *   queryKey: readonly unknown[];
 *   queryFn: (params: Record<string, string | number | boolean | undefined>) => Promise<{
 *     rows: unknown[];
 *     total: number;
 *     from: number | null;
 *     to: number | null;
 *   }>;
 *   extraParams?: Record<string, string | number | boolean | undefined>;
 *   defaultPageSize?: number;
 *   pageSizeOptions?: number[];
 *   tableId?: string;
 *   staleTime?: number;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   loadErrorKey?: string;
 * }} args
 */
export function useTenantPaginatedTable({
  queryKey,
  queryFn,
  extraParams,
  defaultPageSize = 20,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  tableId,
  staleTime = 5 * 60_000,
  t,
  tApiErrors,
  notification,
  loadErrorKey = "loadError",
}) {
  const safePageSizeOptions = useMemo(
    () => (pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS).filter((size) => size <= MAX_PAGE_SIZE),
    [pageSizeOptions],
  );
  const { page, perPage, search, onPageChange, onSearchChange, resetPage } = useServerTablePagination({
    defaultPageSize: Math.min(defaultPageSize, MAX_PAGE_SIZE),
    tableId,
    pageSizeOptions: safePageSizeOptions,
  });

  const extraParamsKey = useMemo(() => JSON.stringify(extraParams ?? {}), [extraParams]);

  useEffect(() => {
    resetPage();
  }, [extraParamsKey, resetPage]);

  const params = useMemo(
    () => ({
      page,
      per_page: perPage,
      ...(search ? { search } : {}),
      ...(extraParams ?? {}),
    }),
    [page, perPage, search, extraParams],
  );

  const query = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => queryFn(params),
    staleTime,
    refetchOnMount: true,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (!query.isError || !query.error) return;
    notification.error({
      title: t(loadErrorKey),
      description: getLocalizedApiErrorMessage(tApiErrors, query.error),
    });
  }, [query.isError, query.error, notification, t, tApiErrors, loadErrorKey]);

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const from = query.data?.from ?? null;
  const to = query.data?.to ?? null;

  return {
    rows,
    total,
    from,
    to,
    page,
    perPage,
    search,
    onPageChange,
    onSearchChange,
    isPending: query.isPending,
    isFetching: query.isFetching,
    refetch: query.refetch,
    pagination: {
      mode: "server",
      current: page,
      pageSize: perPage,
      total,
      pageSizeOptions: safePageSizeOptions,
      onPageChange,
      summaryRange:
        from != null && to != null ? { start: from, end: to, total } : total === 0 ? null : undefined,
    },
  };
}
