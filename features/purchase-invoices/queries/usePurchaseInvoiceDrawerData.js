/**
 * Lookup queries and select options for the purchase invoice drawer.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { isPersistedEntityId } from "@/lib/entityId";
import {
  mapPurchaseInvoiceSupplierOption,
  mergeLookupOptions,
  purchaseInvoicePaymentMethodOption,
  purchaseInvoicePaymentTermOption,
  purchaseInvoiceUomCodeLabel,
  purchaseInvoiceWarehouseCodeLabel,
  purchaseUomUnitCost,
  purchaseInvoiceCodeLabel,
} from "../utils/purchaseInvoiceDrawerUtils";
import { fetchItemInvoiceLineSetup } from "@/features/items/index";
import { fetchSupplier } from "@/features/suppliers/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { fetchCurrencyNames, fetchCurrencyPairRates } from "@/features/currencies/index";
import { useSalesInvoiceItemAvailability } from "@/features/sales-invoices/queries/useSalesInvoiceDrawerData";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "antd";
import { useMemo } from "react";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { SUPPLIERS_LIST_QUERY_KEY } from "@/features/suppliers/queries/suppliersQueryKeys";
import { CURRENCIES_LIST_QUERY_KEY } from "@/features/currencies";
import { itemInvoiceLineSetupQueryKey } from "@/features/items";
import { useCompanySettings } from "@/lib/company-settings";

export { useSalesInvoiceItemAvailability as usePurchaseInvoiceItemAvailability };

/**
 * @param {{
 *   open: boolean;
 *   t: (key: string) => string;
 *   supplierId?: string | null;
 *   invoiceLookups?: Record<string, unknown> | null;
 * }} args
 */
export function usePurchaseInvoiceDrawerData({ open, t, supplierId = null, invoiceLookups = null }) {
  const { settings } = useCompanySettings();
  const primaryCurrencyId = settings.primaryCurrencyId;

  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

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

  const supplierDetailEnabled = open && isPersistedEntityId(supplierId);
  const supplierDetailQuery = useQuery({
    queryKey: [...SUPPLIERS_LIST_QUERY_KEY, supplierId, "full"],
    queryFn: () => fetchSupplier(/** @type {string} */ (supplierId)),
    enabled: supplierDetailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data ?? [])
        .filter((w) => w?.is_active !== false)
        .map((w) => {
          const code = purchaseInvoiceWarehouseCodeLabel(w);
          return {
            value: w.id,
            label: code || String(w.id),
            searchText: `${w.shortcut_name ?? ""} ${w.name ?? ""}`,
            is_default_purchase: Boolean(w.is_default_purchase),
            is_default: Boolean(w.is_default),
          };
        }),
    [warehousesQuery.data],
  );

  const defaultWarehouseId = useMemo(() => {
    const purchaseDefault = warehouseOptions.find((w) => w.is_default_purchase);
    if (purchaseDefault) return purchaseDefault.value;
    const general = warehouseOptions.find((w) => w.is_default);
    return general?.value ?? warehouseOptions[0]?.value;
  }, [warehouseOptions]);

  const supplierSeedOptions = useMemo(() => {
    const option = mapPurchaseInvoiceSupplierOption(
      /** @type {Record<string, unknown> | null} */ (supplierDetailQuery.data ?? null),
    );
    return option ? [option] : [];
  }, [supplierDetailQuery.data]);

  const currencyOptions = useMemo(
    () =>
      (currenciesQuery.data ?? [])
        .filter((c) => c?.is_active !== false)
        .map((c) => ({
          value: c.id,
          label: purchaseInvoiceCodeLabel(c.code, c.name) || String(c.id),
          searchText: `${c.code ?? ""} ${c.name ?? ""}`,
          is_primary: Boolean(c.is_primary),
        })),
    [currenciesQuery.data],
  );

  const supplierDetail = supplierDetailQuery.data ?? null;
  const supplierLookupsPending = supplierDetailEnabled && supplierDetailQuery.isPending;

  const paymentMethodOptions = useMemo(
    () =>
      mergeLookupOptions(
        purchaseInvoicePaymentMethodOption(
          /** @type {Record<string, unknown> | null} */ (supplierDetail?.payment_method),
        ),
        purchaseInvoicePaymentMethodOption(
          /** @type {Record<string, unknown> | null} */ (invoiceLookups?.payment_method),
        ),
      ),
    [supplierDetail?.payment_method, invoiceLookups?.payment_method],
  );

  const paymentTermOptions = useMemo(
    () =>
      mergeLookupOptions(
        purchaseInvoicePaymentTermOption(
          /** @type {Record<string, unknown> | null} */ (supplierDetail?.payment_term),
        ),
        purchaseInvoicePaymentTermOption(
          /** @type {Record<string, unknown> | null} */ (invoiceLookups?.payment_term),
        ),
      ),
    [supplierDetail?.payment_term, invoiceLookups?.payment_term],
  );

  /**
   * @param {number | null | undefined} fromCurrencyId
   */
  function pairRateToPrimary(fromCurrencyId) {
    if (fromCurrencyId == null || primaryCurrencyId == null) return null;
    if (Number(fromCurrencyId) === Number(primaryCurrencyId)) return 1;
    const rows = pairRatesQuery.data ?? [];
    const match = rows.find(
      (row) =>
        Number(row.from_currency_id) === Number(fromCurrencyId) &&
        Number(row.to_currency_id) === Number(primaryCurrencyId),
    );
    if (match?.rate != null) return Number(match.rate);
    const reversed = rows.find(
      (row) =>
        Number(row.from_currency_id) === Number(primaryCurrencyId) &&
        Number(row.to_currency_id) === Number(fromCurrencyId),
    );
    if (reversed?.rate != null && Number(reversed.rate) > 0) {
      return 1 / Number(reversed.rate);
    }
    return null;
  }

  return {
    warehouseOptions,
    defaultWarehouseId,
    supplierSeedOptions,
    currencyOptions,
    paymentMethodOptions,
    paymentTermOptions,
    primaryCurrencyId,
    pairRateToPrimary,
    supplierDetail,
    supplierDetailPending: supplierLookupsPending,
    warehousesPending: warehousesQuery.isPending,
    currenciesPending: currenciesQuery.isPending,
    paymentMethodsPending: supplierLookupsPending,
    paymentTermsPending: supplierLookupsPending,
  };
}

/**
 * @param {{ itemId?: string; t: (key: string) => string; enabled?: boolean }} args
 */
export function usePurchaseInvoiceLineUomOptions({ itemId, t, enabled = true }) {
  const itemReady = enabled && itemId != null && itemId !== "";

  const lineSetupQuery = useQuery({
    queryKey: itemInvoiceLineSetupQueryKey(itemId ?? ""),
    queryFn: () => fetchItemInvoiceLineSetup(itemId),
    enabled: itemReady,
    staleTime: QUERY_STALE_TIME.default,
  });

  const options = useMemo(() => {
    const rows = Array.isArray(lineSetupQuery.data?.item_uoms) ? lineSetupQuery.data.item_uoms : [];
    /** @type {{ value: number | string; label: import("react").ReactNode; searchText?: string; conversion_factor?: unknown; unit_cost?: number | null; barcode?: string; is_base?: boolean; is_default_purchase?: boolean }[]} */
    const result = [];
    for (const row of rows) {
      const codeLabel = purchaseInvoiceUomCodeLabel(row?.uom) || `UOM #${row?.id ?? ""}`;
      const isBase = Boolean(row.is_base);
      const unitCost = purchaseUomUnitCost(row);
      result.push({
        value: row.id,
        label: isBase ? (
          <span className="inline-flex items-center gap-1.5">
            <span>{codeLabel}</span>
            <Tag color="green" variant="filled" className="!m-0 !px-1.5 !py-0 text-[10px] leading-[16px]">
              {t("lineUomBaseBadge")}
            </Tag>
          </span>
        ) : (
          codeLabel
        ),
        searchText: `${row?.uom?.code ?? ""} ${row?.uom?.name ?? ""} ${isBase ? t("lineUomBaseBadge") : ""}`,
        conversion_factor: row.conversion_factor,
        unit_cost: unitCost ?? null,
        barcode: typeof row.barcode === "string" ? row.barcode : "",
        is_base: isBase,
        is_default_purchase: Boolean(row.is_default_purchase),
      });
    }
    return result;
  }, [lineSetupQuery.data, t]);

  return {
    options,
    pending: lineSetupQuery.isLoading,
    rows: Array.isArray(lineSetupQuery.data?.item_uoms) ? lineSetupQuery.data.item_uoms : [],
  };
}
