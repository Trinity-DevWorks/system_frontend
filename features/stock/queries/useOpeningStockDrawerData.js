/**
 * Lookup queries for the opening stock drawer.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { fetchItemNames } from "@/features/items/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { ITEMS_LIST_QUERY_KEY } from "@/features/items";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * @param {{ open: boolean }} args
 */
export function useOpeningStockDrawerData({ open }) {
  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const itemsQuery = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItemNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data ?? [])
        .filter((w) => w?.is_active !== false)
        .map((w) => ({
          value: w.id,
          label:
            typeof w.shortcut_name === "string" && w.shortcut_name.trim()
              ? `${w.shortcut_name} — ${w.name}`
              : String(w.name ?? w.id),
        })),
    [warehousesQuery.data],
  );

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data ?? [])
        .filter((row) => row?.track_inventory !== false && row?.is_active !== false)
        .map((item) => ({
          value: item.id,
          label: formatItemOptionLabel(item),
          track_lots: Boolean(item.track_lots),
        })),
    [itemsQuery.data],
  );

  return {
    warehouseOptions,
    warehousesPending: warehousesQuery.isPending,
    itemOptions,
    itemsPending: itemsQuery.isPending,
  };
}
