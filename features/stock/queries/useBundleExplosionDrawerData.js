/**
 * Lookup queries for the bundle explosion drawer.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { fetchBundleItems } from "@/features/items/api/bundleItems.api";
import { fetchItemNames } from "@/features/items/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { ITEMS_LIST_QUERY_KEY } from "@/features/items";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { isBundleTypeItem } from "../utils/bundleExplosionDrawerUtils";

/**
 * @param {{ open: boolean }} args
 */
export function useBundleExplosionDrawerData({ open }) {
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
    const preferred =
      active.find((w) => w?.is_default_sales) ?? active.find((w) => w?.is_default);
    return preferred?.id ?? active[0]?.id;
  }, [warehousesQuery.data]);

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data ?? [])
        .filter((row) => isBundleTypeItem(row) && row?.is_active !== false)
        .map((item) => ({
          value: item.id,
          label: formatItemOptionLabel(item),
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
export function useBundleExplosionComponents({ itemId, enabled = true }) {
  const id = itemId != null ? String(itemId) : "";
  return useQuery({
    queryKey: [...ITEMS_LIST_QUERY_KEY, id, "bundle-items", "explosion"],
    queryFn: async () => {
      try {
        return await fetchBundleItems(id);
      } catch (err) {
        const status = /** @type {{ response?: { status?: number } }} */ (err)?.response?.status;
        if (status === 404 || status === 422) return [];
        throw err;
      }
    },
    enabled: enabled && id !== "",
    staleTime: QUERY_STALE_TIME.catalog,
  });
}
