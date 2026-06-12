/**
 * Purchasing alerts list query with server-side filters.
 *
 * Used by:
 * - app/[locale]/main/stock/purchasing-alerts/page.js
 */

import { purchasingAlertsQueryKey } from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { fetchPurchasingAlerts } from "@/services/purchasingAlertsApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   warehouseId?: number;
 *   status?: string;
 *   onlyAlerts: boolean;
 * }} args
 */
export function usePurchasingAlertsTableQuery({
  t,
  tApiErrors,
  notification,
  warehouseId,
  status,
  onlyAlerts,
}) {
  const filters = useMemo(
    () => ({
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(status ? { status } : {}),
      only_alerts: onlyAlerts,
    }),
    [warehouseId, status, onlyAlerts],
  );

  const queryKey = purchasingAlertsQueryKey(filters);

  const { data = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPurchasingAlerts(filters),
    staleTime: 60_000,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (!isError || !error) return;
    notification.error({
      title: t("loadError"),
      description: getLocalizedApiErrorMessage(tApiErrors, error),
    });
  }, [isError, error, notification, t, tApiErrors]);

  return {
    tableData: data,
    isPending,
    isFetching,
    refetch,
    queryKey,
  };
}
