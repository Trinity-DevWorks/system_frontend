/**
 * Lookup queries and select options for the purchase order drawer.
 */

import { formatUomLabel } from "../utils/formatStockQuantity";
import { PO_BASE_UOM } from "../utils/purchaseOrderDrawerUtils";
import { fetchItemNames } from "@/features/items/index";
import { fetchItemUoms } from "@/features/items/index";
import { fetchSupplierNames } from "@/features/suppliers/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { ITEMS_LIST_QUERY_KEY } from "@/features/items";

/**
 * @param {{
 *   open: boolean;
 *   t: (key: string) => string;
 * }} args
 */
export function usePurchaseOrderDrawerData({ open, t }) {
  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const suppliersQuery = useQuery({
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    queryFn: fetchSupplierNames,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const itemsQuery = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItemNames,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const purchasableItems = useMemo(
    () =>
      (itemsQuery.data ?? []).filter(
        (row) => row?.allow_purchase !== false && row?.is_active !== false,
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

  const supplierOptions = useMemo(
    () =>
      (suppliersQuery.data ?? [])
        .filter((s) => s?.is_active !== false)
        .map((s) => {
          const code = typeof s.supplier_code === "string" ? s.supplier_code.trim() : "";
          const name = String(s.name ?? s.id);
          return {
            value: s.id,
            label: code ? `${code} — ${name}` : name,
          };
        }),
    [suppliersQuery.data],
  );

  const itemOptions = useMemo(
    () =>
      purchasableItems.map((item) => ({
        value: item.id,
        label: formatItemOptionLabel(item),
      })),
    [purchasableItems],
  );

  return {
    warehouseOptions,
    supplierOptions,
    itemOptions,
    warehousesPending: warehousesQuery.isPending,
    suppliersPending: suppliersQuery.isPending,
    itemsPending: itemsQuery.isPending,
  };
}

/**
 * @param {{ itemId?: string; t: (key: string) => string; enabled?: boolean }} args
 */
export function usePurchaseOrderLineUomOptions({ itemId, t, enabled = true }) {
  const itemUomsQuery = useQuery({
    queryKey: [...ITEMS_LIST_QUERY_KEY, itemId, "item-uoms"],
    queryFn: () => fetchItemUoms(itemId),
    enabled: enabled && itemId != null && itemId !== "",
    staleTime: 60_000,
  });

  const options = useMemo(() => {
    const rows = itemUomsQuery.data ?? [];
    const result = [{ value: PO_BASE_UOM, label: t("poBaseUomOption") }];
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
