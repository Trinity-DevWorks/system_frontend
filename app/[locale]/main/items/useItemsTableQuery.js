/**
 * Items list query, load-error notification, row labels for the table, and manual refresh.
 *
 * Used by:
 * - app/[locale]/main/items/page.js
 */

import { ITEMS_LIST_QUERY_KEY } from "@/components/items/itemsQueryCache";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { getItemTypeLabel } from "@/services/itemTypesApi";
import { fetchItems } from "@/services/itemsApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getItemStatusLabel } from "./getItemTableColumns";

/**
 * @param {{
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   notification: ReturnType<typeof import("antd").App.useApp>["notification"];
 * }} args
 */
export function useItemsTableQuery({ t, tApiErrors, notification }) {
  const queryClient = useQueryClient();
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const { data = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItems,
    staleTime: 2 * 60_000,
    refetchOnMount: true,
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
      data.map((row) => ({
        ...row,
        is_active_label: getItemStatusLabel(row?.is_active, t),
        item_type_label: getItemTypeLabel(row?.item_type),
      })),
    [data, t],
  );

  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      const fresh = await fetchItems();
      queryClient.setQueryData(ITEMS_LIST_QUERY_KEY, fresh);
    } catch (err) {
      notification.error({
        title: t("loadError"),
        description: getLocalizedApiErrorMessage(tApiErrors, err),
      });
    } finally {
      setManualRefreshing(false);
    }
  };

  return {
    tableData,
    isPending,
    isFetching,
    refetch,
    handleRefresh,
    refreshFetching: isFetching || manualRefreshing,
  };
}
