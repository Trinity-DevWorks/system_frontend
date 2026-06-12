/**
 * Stock balances list query with server-side filters.
 *
 * Used by:
 * - app/[locale]/main/stock/balances/page.js
 */

import { stockBalancesQueryKey } from "@/components/stock/stockQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { fetchStockBalances } from "@/services/stockApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 *   warehouseId?: number;
 *   onlyWithStock: boolean;
 * }} args
 */
export function useStockBalancesTableQuery({
  t,
  tApiErrors,
  notification,
  warehouseId,
  onlyWithStock,
}) {
  const filters = useMemo(
    () => ({
      ...(warehouseId != null ? { warehouse_id: warehouseId } : {}),
      ...(onlyWithStock ? { only_with_stock: true } : {}),
    }),
    [warehouseId, onlyWithStock],
  );

  const queryKey = stockBalancesQueryKey(filters);

  const { data = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchStockBalances(filters),
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
