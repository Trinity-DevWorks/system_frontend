/**
 * Audit log list query with server-side filters and pagination.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { fetchAudits } from "../api/audits.api";
import { getAuditableTypeLabel, getAuditEventLabel } from "../utils/auditLogLabels";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { auditLogDetailQueryKey } from "./auditsQueryKeys";

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
export function useAuditLogTableQuery({
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

  const queryKey = useMemo(() => auditLogDetailQueryKey(filters), [filters]);

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAudits(filters),
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

  const tableData = useMemo(
    () =>
      (data?.rows ?? []).map((row) => ({
        ...row,
        event_label: getAuditEventLabel(t, /** @type {string} */ (row?.event)),
        user_label: row?.user?.name || row?.user?.email || "",
        auditable_type_label: getAuditableTypeLabel(t, row?.auditable?.type),
        auditable_id_label: row?.auditable?.id != null ? String(row.auditable.id) : "",
      })),
    [data, t],
  );

  return {
    tableData,
    total: data?.total ?? 0,
    from: data?.from ?? null,
    to: data?.to ?? null,
    isPending,
    isFetching,
    refetch,
  };
}
