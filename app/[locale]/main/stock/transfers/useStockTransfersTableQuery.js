/**
 * Stock transfers list query with server-side filters.
 */

import { stockTransfersQueryKey } from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { fetchStockTransfers } from "@/services/stockTransfersApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   status?: string;
 *   fromWarehouseId?: number;
 *   toWarehouseId?: number;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function useStockTransfersTableQuery({
  t,
  tApiErrors,
  notification,
  status,
  fromWarehouseId,
  toWarehouseId,
  from,
  to,
}) {
  const filters = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(fromWarehouseId != null ? { from_warehouse_id: fromWarehouseId } : {}),
      ...(toWarehouseId != null ? { to_warehouse_id: toWarehouseId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      limit: 500,
    }),
    [status, fromWarehouseId, toWarehouseId, from, to],
  );

  const queryKey = stockTransfersQueryKey(filters);

  const { data = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchStockTransfers(filters),
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
