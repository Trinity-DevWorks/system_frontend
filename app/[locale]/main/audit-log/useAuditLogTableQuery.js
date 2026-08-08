/**
 * Audit log list query with server-side filters and pagination.
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { fetchAudits } from "@/services/auditsApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

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
      page,
      per_page: perPage,
    }),
    [event, auditableType, auditableId, tags, from, to, page, perPage],
  );

  const queryKey = useMemo(() => ["tenant", "audits", filters], [filters]);

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAudits(filters),
    staleTime: 30_000,
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
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    from: data?.from ?? null,
    to: data?.to ?? null,
    isPending,
    isFetching,
    refetch,
  };
}
