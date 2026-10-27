/**
 * Lookup queries and select options for the purchase order drawer.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { isPersistedEntityId } from "@/lib/entityId";
import { mapItemUomsToLineSelectOptions } from "../utils/itemLineUomOptions";
import { buildLastPurchasePriceByItemId } from "../utils/purchaseOrderLastPurchasePrice";
import { buildLeadTimeDaysByItemId } from "../utils/purchaseOrderExpectedDate";
import { fetchItemNames, fetchItemUoms, fetchSupplierItems } from "@/features/items/index";
import { fetchSupplier, fetchSupplierNames } from "@/features/suppliers/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { fetchCurrencyNames, fetchCurrencyPairRates } from "@/features/currencies/index";
import { CURRENCIES_LIST_QUERY_KEY } from "@/features/currencies";
import { rateFromPrimary } from "@/lib/currency/documentExchangeRate";
import { useCompanySettings } from "@/lib/company-settings";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { SUPPLIERS_LIST_QUERY_KEY, supplierDetailQueryKey, supplierItemsBySupplierQueryKey } from "@/features/suppliers";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { ITEMS_LIST_QUERY_KEY } from "@/features/items";

const EMPTY_LAST_PURCHASE_PRICES = /** @type {Map<string, number>} */ (new Map());
const EMPTY_LEAD_TIMES = /** @type {Map<string, number>} */ (new Map());

/**
 * @param {{
 *   open: boolean;
 *   t: (key: string) => string;
 *   supplierId?: string | null;
 *   loadSupplierPrices?: boolean;
 * }} args
 */
export function usePurchaseOrderDrawerData({ open, t, supplierId = null, loadSupplierPrices = true }) {
  const { settings } = useCompanySettings();
  const primaryCurrencyId = settings.primaryCurrencyId;

  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_LIST_QUERY_KEY,
    queryFn: fetchCurrencyNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const pairRatesQuery = useQuery({
    queryKey: [...CURRENCIES_LIST_QUERY_KEY, "pair-rates"],
    queryFn: fetchCurrencyPairRates,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const suppliersQuery = useQuery({
    queryKey: SUPPLIERS_LIST_QUERY_KEY,
    queryFn: fetchSupplierNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const itemsQuery = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItemNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  // Supplier detail carries the VAT exemption used by the live line totals.
  const supplierDetailEnabled = open && isPersistedEntityId(supplierId);
  const supplierDetailQuery = useQuery({
    queryKey: supplierDetailQueryKey(/** @type {string} */ (supplierId)),
    queryFn: () => fetchSupplier(/** @type {string} */ (supplierId)),
    enabled: supplierDetailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const supplierPricesEnabled =
    open && loadSupplierPrices && isPersistedEntityId(supplierId);
  const supplierItemsQuery = useQuery({
    queryKey: supplierItemsBySupplierQueryKey(/** @type {string} */ (supplierId)),
    queryFn: () => fetchSupplierItems(/** @type {string} */ (supplierId)),
    enabled: supplierPricesEnabled,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const lastPriceByItemId = useMemo(
    () =>
      supplierPricesEnabled
        ? buildLastPurchasePriceByItemId(supplierItemsQuery.data)
        : EMPTY_LAST_PURCHASE_PRICES,
    [supplierPricesEnabled, supplierItemsQuery.data],
  );

  const leadTimeByItemId = useMemo(
    () =>
      supplierPricesEnabled
        ? buildLeadTimeDaysByItemId(supplierItemsQuery.data)
        : EMPTY_LEAD_TIMES,
    [supplierPricesEnabled, supplierItemsQuery.data],
  );

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
        vat_percentage: item?.vat_group?.percentage != null ? Number(item.vat_group.percentage) : 0,
      })),
    [purchasableItems],
  );

  const currencyOptions = useMemo(
    () =>
      (currenciesQuery.data ?? [])
        .filter((c) => c?.is_active !== false)
        .map((c) => {
          const code = typeof c.code === "string" ? c.code.trim() : "";
          const name = String(c.name ?? c.id);
          return { value: Number(c.id), label: code && code !== name ? `${code} — ${name}` : name };
        }),
    [currenciesQuery.data],
  );

  /**
   * @param {number | null | undefined} currencyId
   */
  function currencyRow(currencyId) {
    if (currencyId == null) return null;
    return (currenciesQuery.data ?? []).find((c) => Number(c.id) === Number(currencyId)) ?? null;
  }

  return {
    warehouseOptions,
    supplierOptions,
    itemOptions,
    currencyOptions,
    primaryCurrencyId,
    /** @param {number | null | undefined} currencyId */
    rateFromPrimary: (currencyId) => rateFromPrimary(pairRatesQuery.data ?? [], primaryCurrencyId, currencyId),
    /** @param {number | null | undefined} currencyId */
    currencySymbol: (currencyId) => String(currencyRow(currencyId)?.symbol ?? "").trim(),
    /** @param {number | null | undefined} currencyId */
    currencyCode: (currencyId) => String(currencyRow(currencyId)?.code ?? "").trim(),
    currenciesPending: currenciesQuery.isPending,
    lastPriceByItemId,
    leadTimeByItemId,
    supplierDetail: supplierDetailEnabled ? /** @type {Record<string, unknown> | null} */ (supplierDetailQuery.data ?? null) : null,
    supplierPricesPending: supplierPricesEnabled && supplierItemsQuery.isPending,
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
    staleTime: QUERY_STALE_TIME.default,
  });

  const options = useMemo(
    () => mapItemUomsToLineSelectOptions(itemUomsQuery.data, t),
    [itemUomsQuery.data, t],
  );

  return {
    options,
    pending: itemUomsQuery.isLoading,
  };
}
