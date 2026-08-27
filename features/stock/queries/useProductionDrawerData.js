/**
 * Lookup queries for the production drawer.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { fetchRecipe } from "@/features/items/api/recipes.api";
import { fetchItemNames } from "@/features/items/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { ITEMS_LIST_QUERY_KEY } from "@/features/items";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { isProduceItem } from "../utils/productionDrawerUtils";

/**
 * @param {{ open: boolean }} args
 */
export function useProductionDrawerData({ open }) {
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

  const defaultWarehouseId = useMemo(() => {
    const active = (warehousesQuery.data ?? []).filter((w) => w?.is_active !== false);
    const preferred = active.find((w) => w?.is_default_production);
    return preferred?.id ?? active[0]?.id;
  }, [warehousesQuery.data]);

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data ?? [])
        .filter((row) => isProduceItem(row) && row?.track_inventory !== false && row?.is_active !== false)
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
    defaultWarehouseId,
    itemOptions,
    itemsPending: itemsQuery.isPending,
  };
}

/**
 * @param {{ itemId?: string; enabled?: boolean }} args
 */
export function useProductionRecipe({ itemId, enabled = true }) {
  const id = itemId != null ? String(itemId) : "";
  return useQuery({
    queryKey: [...ITEMS_LIST_QUERY_KEY, id, "recipe", "production"],
    queryFn: () => fetchRecipe(id),
    enabled: enabled && id !== "",
    staleTime: QUERY_STALE_TIME.catalog,
  });
}
