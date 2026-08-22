/**
 * Purchasing alerts list query with server-side filters and pagination.
 *
 * Used by:
 * - app/[locale]/main/stock/purchasing-alerts/page.js
 */

import { PURCHASING_ALERTS_QUERY_KEY } from "./stockQueryKeys";
import { fetchPurchasingAlerts } from "../api/purchasingAlerts.api";
import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { useMemo } from "react";

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
  const extraParams = useMemo(
    () => ({
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(status ? { status } : {}),
      only_alerts: onlyAlerts,
    }),
    [warehouseId, status, onlyAlerts],
  );

  const table = useTenantPaginatedTable({
    queryKey: PURCHASING_ALERTS_QUERY_KEY,
    queryFn: fetchPurchasingAlerts,
    extraParams,
    staleTime: 60_000,
    tableId: "purchasing-alerts",
    t,
    tApiErrors,
    notification,
  });

  return {
    tableData: table.rows,
    isPending: table.isPending,
    isFetching: table.isFetching,
    refetch: table.refetch,
    queryKey: [...PURCHASING_ALERTS_QUERY_KEY, extraParams],
    pagination: table.pagination,
    onSearchChange: table.onSearchChange,
  };
}
