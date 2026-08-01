/**
 * Purchase orders list query with server-side filters.
 */

import { purchaseOrdersQueryKey } from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { fetchPurchaseOrders } from "@/services/purchaseOrdersApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   status?: string;
 *   supplierId?: string;
 *   warehouseId?: number;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function usePurchaseOrdersTableQuery({
  t,
  tApiErrors,
  notification,
  status,
  supplierId,
  warehouseId,
  from,
  to,
}) {
  const filters = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(supplierId ? { supplier_id: supplierId } : {}),
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      limit: 500,
    }),
    [status, supplierId, warehouseId, from, to],
  );

  const queryKey = purchaseOrdersQueryKey(filters);

  const { data = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPurchaseOrders(filters),
    staleTime: 30_000,
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
  };
}
