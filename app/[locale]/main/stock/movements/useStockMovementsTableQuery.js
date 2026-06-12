/**
 * Stock movements list query with server-side filters.
 *
 * Used by:
 * - app/[locale]/main/stock/movements/page.js
 */

import { stockMovementsQueryKey } from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { fetchStockMovements } from "@/services/stockApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   warehouseId?: number;
 *   movementType?: string;
 *   from?: string;
 *   to?: string;
 * }} args
 */
export function useStockMovementsTableQuery({
  t,
  tApiErrors,
  notification,
  warehouseId,
  movementType,
  from,
  to,
}) {
  const filters = useMemo(
    () => ({
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(movementType ? { type: movementType } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      limit: 500,
    }),
    [warehouseId, movementType, from, to],
  );

  const queryKey = stockMovementsQueryKey(filters);

  const { data = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchStockMovements(filters),
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
