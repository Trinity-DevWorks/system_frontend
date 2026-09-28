/**
 * Central audit log list query with server-side filters and pagination.
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { fetchCentralAudits } from "../api/audits.api";
import { centralAuditLogListQueryKey } from "./auditsQueryKeys";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   event?: string;
 *   auditableType?: string;
 *   auditableId?: string;
 *   tags?: string;
 *   from?: string;
 *   to?: string;
 *   search?: string;
 *   page: number;
 *   perPage: number;
 * }} args
 */
export function useCentralAuditLogTableQuery({
  t,
  tApiErrors,
  notification,
  event,
  auditableType,
  auditableId,
  tags,
  from,
  to,
  search,
  page,
  perPage,
}) {
  const filters = useMemo(
    () => ({
      ...(event ? { event } : {}),
      ...(auditableType ? { auditable_type: auditableType } : {}),
      ...(auditableId ? { auditable_id: auditableId } : {}),
      ...(tags ? { tags } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(search ? { search } : {}),
      page,
      per_page: perPage,
    }),
    [event, auditableType, auditableId, tags, from, to, search, page, perPage],
  );

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: centralAuditLogListQueryKey(filters),
    queryFn: () => fetchCentralAudits(filters),
    staleTime: QUERY_STALE_TIME.ledger,
    refetchOnMount: true,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (!isError || !error) return;
    notification.error({
      title: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  }, [isError, error, notification, t, tApiErrors]);

  return {
    tableData: data?.rows ?? [],
    total: data?.total ?? 0,
    from: data?.from ?? null,
    to: data?.to ?? null,
    isPending,
    isFetching,
    refetch,
  };
}
