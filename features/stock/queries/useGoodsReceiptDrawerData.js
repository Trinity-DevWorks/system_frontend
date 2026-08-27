/**
 * Lookup queries for the goods receipt drawer.
 * View/posted receipts already include names on the detail payload — do not
 * refetch catalogs just to render a read-only drawer.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { fetchPurchaseOrders } from "../api/purchaseOrders.api";
import { fetchItemNames } from "@/features/items/index";
import { fetchSupplierNames } from "@/features/suppliers/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { ITEMS_LIST_QUERY_KEY } from "@/features/items";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PURCHASE_ORDERS_QUERY_KEY } from "./stockQueryKeys";

/**
 * @param {{
 *   open: boolean;
 *   loadPurchaseOrders?: boolean;
 *   loadCatalogs?: boolean;
 * }} args
 */
export function useGoodsReceiptDrawerData({
  open,
  loadPurchaseOrders = false,
  loadCatalogs = false,
}) {
  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    enabled: open && loadCatalogs,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const suppliersQuery = useQuery({
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    queryFn: fetchSupplierNames,
    enabled: open && loadCatalogs,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const itemsQuery = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItemNames,
    enabled: open && loadCatalogs,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const confirmedPosQuery = useQuery({
    queryKey: [...PURCHASE_ORDERS_QUERY_KEY, "receivable", "confirmed"],
    queryFn: () => fetchPurchaseOrders({ status: "confirmed", per_page: 100 }),
    enabled: open && loadPurchaseOrders,
    staleTime: QUERY_STALE_TIME.default,
  });

  const sentPosQuery = useQuery({
    queryKey: [...PURCHASE_ORDERS_QUERY_KEY, "receivable", "sent"],
    queryFn: () => fetchPurchaseOrders({ status: "sent", per_page: 100 }),
    enabled: open && loadPurchaseOrders,
    staleTime: QUERY_STALE_TIME.default,
  });

  const purchaseOrderOptions = useMemo(() => {
    const rows = [
      ...(confirmedPosQuery.data?.rows ?? []),
      ...(sentPosQuery.data?.rows ?? []),
    ];
    return rows.map((order) => ({
      value: order.id,
      label: [order.po_number, order.supplier?.name].filter(Boolean).join(" — ") || String(order.id),
    }));
  }, [confirmedPosQuery.data, sentPosQuery.data]);

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
      (itemsQuery.data ?? [])
        .filter((row) => row?.allow_purchase !== false && row?.is_active !== false)
        .map((item) => ({
          value: item.id,
          label: formatItemOptionLabel(item),
          track_lots: Boolean(item.track_lots),
        })),
    [itemsQuery.data],
  );

  return {
    purchaseOrderOptions,
    purchaseOrdersPending: confirmedPosQuery.isPending || sentPosQuery.isPending,
    warehouseOptions,
    warehousesPending: warehousesQuery.isPending,
    supplierOptions,
    suppliersPending: suppliersQuery.isPending,
    itemOptions,
    itemsPending: itemsQuery.isPending,
  };
}
