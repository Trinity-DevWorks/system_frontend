/**
 * Lookup queries and select options for the sales invoice drawer.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { isPersistedEntityId } from "@/lib/entityId";
import {
  mergeLookupOptions,
  salesInvoiceCodeLabel,
  salesInvoiceItemCodeLabel,
  salesInvoicePaymentMethodOption,
  salesInvoicePaymentTermOption,
  salesInvoiceSalesmanOption,
  salesInvoiceUomCodeLabel,
  salesInvoiceWarehouseCodeLabel,
} from "../utils/salesInvoiceDrawerUtils";
import { fetchItemNames, fetchItemUoms, fetchItemBarcodes } from "@/features/items/index";
import { fetchCustomer, fetchCustomerNames } from "@/features/customers/index";
import { fetchWarehouseNames } from "@/features/warehouses/index";
import { fetchCurrencyNames, fetchCurrencyPairRates } from "@/features/currencies/index";
import { fetchSalesInvoiceItemAvailability } from "../api/salesInvoices.api";
import { salesInvoiceItemAvailabilityQueryKey } from "./salesInvoicesQueryKeys";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "antd";
import { useMemo } from "react";
import { WAREHOUSES_LIST_QUERY_KEY } from "@/features/warehouses";
import { CUSTOMERS_LIST_QUERY_KEY } from "@/features/customers";
import { CURRENCIES_LIST_QUERY_KEY } from "@/features/currencies";
import { ITEMS_LIST_QUERY_KEY, itemDetailQueryKey } from "@/features/items";
import { useCompanySettings } from "@/lib/company-settings";

/**
 * @param {{
 *   open: boolean;
 *   t: (key: string) => string;
 *   customerId?: string | null;
 *   invoiceLookups?: Record<string, unknown> | null;
 * }} args
 */
export function useSalesInvoiceDrawerData({ open, t, customerId = null, invoiceLookups = null }) {
  const { settings } = useCompanySettings();
  const primaryCurrencyId = settings.primaryCurrencyId;

  const warehousesQuery = useQuery({
    queryKey: WAREHOUSES_LIST_QUERY_KEY,
    queryFn: fetchWarehouseNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const customersQuery = useQuery({
    queryKey: CUSTOMERS_LIST_QUERY_KEY,
    queryFn: fetchCustomerNames,
    enabled: open,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const itemsQuery = useQuery({
    queryKey: ITEMS_LIST_QUERY_KEY,
    queryFn: fetchItemNames,
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

  const customerDetailEnabled = open && isPersistedEntityId(customerId);
  const customerDetailQuery = useQuery({
    queryKey: [...CUSTOMERS_LIST_QUERY_KEY, customerId, "full"],
    queryFn: () => fetchCustomer(/** @type {string} */ (customerId)),
    enabled: customerDetailEnabled,
    staleTime: QUERY_STALE_TIME.default,
  });

  const sellableItems = useMemo(
    () =>
      (itemsQuery.data ?? []).filter(
        (row) => row?.allow_sale !== false && row?.is_active !== false,
      ),
    [itemsQuery.data],
  );

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data ?? [])
        .filter((w) => w?.is_active !== false)
        .map((w) => {
          const code = salesInvoiceWarehouseCodeLabel(w);
          return {
            value: w.id,
            label: code || String(w.id),
            searchText: `${w.shortcut_name ?? ""} ${w.name ?? ""}`,
            is_default_sales: Boolean(w.is_default_sales),
            is_default: Boolean(w.is_default),
          };
        }),
    [warehousesQuery.data],
  );

  const defaultWarehouseId = useMemo(() => {
    const salesDefault = warehouseOptions.find((w) => w.is_default_sales);
    if (salesDefault) return salesDefault.value;
    const general = warehouseOptions.find((w) => w.is_default);
    return general?.value ?? warehouseOptions[0]?.value;
  }, [warehouseOptions]);

  const customerOptions = useMemo(
    () =>
      (customersQuery.data ?? [])
        .filter((c) => c?.status !== "blacklisted")
        .map((c) => {
          const code = typeof c.customer_code === "string" ? c.customer_code.trim() : "";
          const name = String(c.name ?? c.id);
          return {
            value: c.id,
            label: code ? `${code} — ${name}` : name,
          };
        }),
    [customersQuery.data],
  );

  const itemOptions = useMemo(
    () =>
      sellableItems.map((item) => ({
        value: String(item.id),
        label: salesInvoiceItemCodeLabel(item),
        searchText: `${item.item_code ?? ""} ${item.name ?? ""}`,
        track_inventory: Boolean(item.track_inventory),
        track_lots: Boolean(item.track_lots),
        vat_percentage:
          item.vat_group?.percentage != null && item.vat_group.percentage !== ""
            ? Number(item.vat_group.percentage)
            : 0,
      })),
    [sellableItems],
  );

  const itemsById = useMemo(() => {
    /** @type {Map<string, Record<string, unknown>>} */
    const map = new Map();
    for (const item of sellableItems) {
      if (item?.id != null) map.set(String(item.id), item);
    }
    return map;
  }, [sellableItems]);

  const currencyOptions = useMemo(
    () =>
      (currenciesQuery.data ?? [])
        .filter((c) => c?.is_active !== false)
        .map((c) => ({
          value: c.id,
          label: salesInvoiceCodeLabel(c.code, c.name) || String(c.id),
          searchText: `${c.code ?? ""} ${c.name ?? ""}`,
          is_primary: Boolean(c.is_primary),
        })),
    [currenciesQuery.data],
  );

  const customerDetail = customerDetailQuery.data ?? null;
  const customerLookupsPending = customerDetailEnabled && customerDetailQuery.isPending;

  const paymentMethodOptions = useMemo(
    () =>
      mergeLookupOptions(
        salesInvoicePaymentMethodOption(/** @type {Record<string, unknown> | null} */ (customerDetail?.payment_method)),
        salesInvoicePaymentMethodOption(/** @type {Record<string, unknown> | null} */ (invoiceLookups?.payment_method)),
      ),
    [customerDetail?.payment_method, invoiceLookups?.payment_method],
  );

  const paymentTermOptions = useMemo(
    () =>
      mergeLookupOptions(
        salesInvoicePaymentTermOption(/** @type {Record<string, unknown> | null} */ (customerDetail?.payment_term)),
        salesInvoicePaymentTermOption(/** @type {Record<string, unknown> | null} */ (invoiceLookups?.payment_term)),
      ),
    [customerDetail?.payment_term, invoiceLookups?.payment_term],
  );

  const salesmanOptions = useMemo(
    () =>
      mergeLookupOptions(
        salesInvoiceSalesmanOption(/** @type {Record<string, unknown> | null} */ (customerDetail?.salesman)),
        salesInvoiceSalesmanOption(/** @type {Record<string, unknown> | null} */ (invoiceLookups?.salesman)),
      ),
    [customerDetail?.salesman, invoiceLookups?.salesman],
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
    customerOptions,
    itemOptions,
    itemsById,
    currencyOptions,
    paymentMethodOptions,
    paymentTermOptions,
    salesmanOptions,
    primaryCurrencyId,
    pairRateToPrimary,
    customerDetail,
    customerDetailPending: customerLookupsPending,
    warehousesPending: warehousesQuery.isPending,
    customersPending: customersQuery.isPending,
    itemsPending: itemsQuery.isPending,
    currenciesPending: currenciesQuery.isPending,
    paymentMethodsPending: customerLookupsPending,
    paymentTermsPending: customerLookupsPending,
    salesmenPending: customerLookupsPending,
  };
}

/**
 * Prefer item_uoms.barcode, else primary/first row from item_barcodes for that UOM.
 * @param {Record<string, unknown>} uomRow
 * @param {unknown[]} barcodes
 */
function resolveSalesInvoiceUomBarcode(uomRow, barcodes) {
  if (typeof uomRow?.barcode === "string" && uomRow.barcode.trim()) {
    return uomRow.barcode.trim();
  }
  const uomId = uomRow?.id != null ? Number(uomRow.id) : null;
  if (uomId == null || !Number.isFinite(uomId)) return "";
  const forUom = barcodes.filter(
    (row) =>
      row &&
      typeof row === "object" &&
      Number(/** @type {{ item_uom_id?: unknown }} */ (row).item_uom_id) === uomId,
  );
  const primary = forUom.find((row) => Boolean(/** @type {{ is_primary?: unknown }} */ (row).is_primary));
  const pick = primary ?? forUom[0];
  const code = pick && typeof /** @type {{ barcode?: unknown }} */ (pick).barcode === "string"
    ? /** @type {{ barcode: string }} */ (pick).barcode.trim()
    : "";
  return code;
}

/**
 * @param {{ itemId?: string; t: (key: string) => string; enabled?: boolean }} args
 */
export function useSalesInvoiceLineUomOptions({ itemId, t, enabled = true }) {
  const itemReady = enabled && itemId != null && itemId !== "";

  const itemUomsQuery = useQuery({
    queryKey: [...itemDetailQueryKey(itemId ?? ""), "item-uoms"],
    queryFn: () => fetchItemUoms(itemId),
    enabled: itemReady,
    staleTime: QUERY_STALE_TIME.default,
  });

  const itemBarcodesQuery = useQuery({
    queryKey: [...ITEMS_LIST_QUERY_KEY, itemId ?? "", "barcodes"],
    queryFn: () => fetchItemBarcodes(itemId),
    enabled: itemReady,
    staleTime: QUERY_STALE_TIME.default,
  });

  const options = useMemo(() => {
    const rows = itemUomsQuery.data ?? [];
    const barcodes = itemBarcodesQuery.data ?? [];
    /** @type {{ value: number | string; label: import("react").ReactNode; searchText?: string; conversion_factor?: unknown; selling_price?: number | null; barcode?: string; is_base?: boolean; is_default_sale?: boolean }[]} */
    const result = [];
    for (const row of rows) {
      const codeLabel = salesInvoiceUomCodeLabel(row?.uom) || `UOM #${row?.uom_id ?? row?.id}`;
      const isBase = Boolean(row.is_base);
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
        selling_price: row.selling_price != null ? Number(row.selling_price) : null,
        barcode: resolveSalesInvoiceUomBarcode(row, barcodes),
        is_base: isBase,
        is_default_sale: Boolean(row.is_default_sale),
      });
    }
    return result;
  }, [itemBarcodesQuery.data, itemUomsQuery.data, t]);

  return {
    options,
    pending: itemUomsQuery.isLoading || itemBarcodesQuery.isLoading,
    rows: itemUomsQuery.data ?? [],
  };
}

/**
 * @param {{ itemId?: string; enabled?: boolean }} args
 */
export function useSalesInvoiceItemAvailability({ itemId, enabled = true }) {
  const query = useQuery({
    queryKey: salesInvoiceItemAvailabilityQueryKey(itemId),
    queryFn: () => fetchSalesInvoiceItemAvailability(/** @type {string} */ (itemId)),
    enabled: enabled && isPersistedEntityId(itemId),
    staleTime: QUERY_STALE_TIME.ledger,
  });

  return {
    rows: query.data ?? [],
    pending: query.isLoading,
  };
}
