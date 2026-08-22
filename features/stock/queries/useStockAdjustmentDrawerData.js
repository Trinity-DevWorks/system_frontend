/**
 * Lookup queries and select options for the stock adjustment drawer.
 *
 * Used by:
 * - app/[locale]/main/stock/adjustment/StockAdjustmentDrawer.js
 */

import { fetchItemUoms } from "@/features/items/index";
import { fetchItemNames } from "@/features/items/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { formatUomLabel } from "../utils/formatStockQuantity";
import { isPersistedEntityId } from "@/lib/entityId";
import { STOCK_ADJUSTMENT_BASE_UOM } from "../utils/stockAdjustmentDrawerUtils";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { ITEMS_LIST_QUERY_KEY } from "@/features/items";

/**
 * @param {{
 *   open: boolean;
 *   itemId?: string;
 *   t: (key: string) => string;
 * }} args
 */
export function useStockAdjustmentDrawerData({ open, itemId, t }) {
  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const itemsQuery = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItemNames,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const itemUomsQuery = useQuery({
    queryKey: [...ITEMS_LIST_QUERY_KEY, itemId, "item-uoms"],
    queryFn: () => fetchItemUoms(itemId),
    enabled: open && isPersistedEntityId(itemId),
    staleTime: 60_000,
  });

  const stockableItems = useMemo(
    () =>
      (itemsQuery.data ?? []).filter(
        (row) => row?.track_inventory === true && row?.is_active !== false,
      ),
    [itemsQuery.data],
  );

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
      stockableItems.map((item) => ({
        value: item.id,
        label: formatItemOptionLabel(item),
      })),
    [stockableItems],
  );

  const itemUomOptions = useMemo(() => {
    const rows = itemUomsQuery.data ?? [];
    const options = [
      { value: STOCK_ADJUSTMENT_BASE_UOM, label: t("adjustmentBaseUomOption") },
    ];
    for (const row of rows) {
      const uom = row?.uom;
      const label = formatUomLabel(uom) || `UOM #${row?.uom_id ?? row?.id}`;
      options.push({ value: row.id, label });
    }
    return options;
  }, [itemUomsQuery.data, t]);

  return {
    stockableItems,
    warehouseOptions,
    itemOptions,
    itemUomOptions,
    warehousesPending: warehousesQuery.isPending,
    itemsPending: itemsQuery.isPending,
    itemUomsPending: itemUomsQuery.isPending,
  };
}
