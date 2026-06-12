/**
 * Lookup queries and select options for the stock transfer drawer.
 */

import { formatUomLabel } from "../../shared/formatStockQuantity";
import { STOCK_TRANSFER_BASE_UOM } from "./stockTransferDrawerUtils";
import { fetchItems } from "@/services/itemsApi";
import { fetchItemUoms } from "@/services/itemUomsApi";
import { fetchWarehouses } from "@/services/warehousesApi";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * @param {{
 *   open: boolean;
 *   t: (key: string) => string;
 * }} args
 */
export function useStockTransferDrawerData({ open, t }) {
  const warehousesQuery = useQuery({
    queryKey: ["tenant", "warehouses"],
    queryFn: fetchWarehouses,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const itemsQuery = useQuery({
    queryKey: ["tenant", "items"],
    queryFn: fetchItems,
    enabled: open,
    staleTime: 5 * 60_000,
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
        label:
          typeof item.sku === "string" && item.sku.trim()
            ? `${item.sku} — ${item.name}`
            : String(item.name ?? item.id),
      })),
    [stockableItems],
  );

  return {
    warehouseOptions,
    itemOptions,
    warehousesPending: warehousesQuery.isPending,
    itemsPending: itemsQuery.isPending,
  };
}

/**
 * @param {{ itemId?: string; t: (key: string) => string; enabled?: boolean }} args
 */
export function useTransferLineUomOptions({ itemId, t, enabled = true }) {
  const itemUomsQuery = useQuery({
    queryKey: ["tenant", "items", itemId, "item-uoms"],
    queryFn: () => fetchItemUoms(itemId),
    enabled: enabled && itemId != null && itemId !== "",
    staleTime: 60_000,
  });

  const options = useMemo(() => {
    const rows = itemUomsQuery.data ?? [];
    const result = [
      { value: STOCK_TRANSFER_BASE_UOM, label: t("transferBaseUomOption") },
    ];
    for (const row of rows) {
      const label = formatUomLabel(row?.uom) || `UOM #${row?.uom_id ?? row?.id}`;
      result.push({ value: row.id, label });
    }
    return result;
  }, [itemUomsQuery.data, t]);

  return {
    options,
    pending: itemUomsQuery.isPending,
  };
}
