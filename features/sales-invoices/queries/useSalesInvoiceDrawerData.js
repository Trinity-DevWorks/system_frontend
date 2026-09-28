/**
 * Lookup queries and select options for the sales invoice drawer.
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { isPersistedEntityId } from "@/lib/entityId";
import {
  mergeLookupOptions,
  mapSalesInvoiceCustomerOption,
  salesInvoiceCodeLabel,
  salesInvoicePaymentMethodOption,
  salesInvoicePaymentTermOption,
  salesInvoiceSalesmanOption,
  salesInvoiceUomCodeLabel,
  salesInvoiceWarehouseCodeLabel,
} from "../utils/salesInvoiceDrawerUtils";
import { fetchItemInvoiceLineSetup } from "@/features/items/index";
import { fetchCustomer } from "@/features/customers/index";
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
import { itemInvoiceLineSetupQueryKey } from "@/features/items";
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

  const warehouseOptions = useMemo(() => {
    const options = (warehousesQuery.data ?? [])
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
      });
    const sealed = invoiceLookups?.preferSealed ? invoiceLookups.warehouse : null;
    if (!sealed || typeof sealed !== "object" || sealed.id == null) return options;
    const label = salesInvoiceWarehouseCodeLabel(sealed);
    if (!label) return options;
    const index = options.findIndex((row) => Number(row.value) === Number(sealed.id));
    if (index >= 0) {
      options[index] = { ...options[index], label };
    }
    return options;
  }, [warehousesQuery.data, invoiceLookups]);

  const defaultWarehouseId = useMemo(() => {
    const salesDefault = warehouseOptions.find((w) => w.is_default_sales);
    if (salesDefault) return salesDefault.value;
    const general = warehouseOptions.find((w) => w.is_default);
    return general?.value ?? warehouseOptions[0]?.value;
  }, [warehouseOptions]);

  const customerSeedOptions = useMemo(() => {
    const sealed = invoiceLookups?.preferSealed ? invoiceLookups.customer : null;
    const option =
      (sealed && typeof sealed === "object"
        ? mapSalesInvoiceCustomerOption(/** @type {Record<string, unknown>} */ (sealed))
        : null) ??
      mapSalesInvoiceCustomerOption(
        /** @type {Record<string, unknown> | null} */ (customerDetailQuery.data ?? null),
      );
    return option ? [option] : [];
  }, [customerDetailQuery.data, invoiceLookups]);

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

  const preferSealed = Boolean(invoiceLookups?.preferSealed);
  const paymentMethodOptions = useMemo(() => {
    const customerOption = salesInvoicePaymentMethodOption(
      /** @type {Record<string, unknown> | null} */ (customerDetail?.payment_method),
    );
    const invoiceOption = salesInvoicePaymentMethodOption(
      /** @type {Record<string, unknown> | null} */ (invoiceLookups?.payment_method),
    );
    return mergeLookupOptions(
      ...(preferSealed ? [invoiceOption, customerOption] : [customerOption, invoiceOption]),
    );
  }, [customerDetail?.payment_method, invoiceLookups?.payment_method, preferSealed]);

  const paymentTermOptions = useMemo(() => {
    const customerOption = salesInvoicePaymentTermOption(
      /** @type {Record<string, unknown> | null} */ (customerDetail?.payment_term),
    );
    const invoiceOption = salesInvoicePaymentTermOption(
      /** @type {Record<string, unknown> | null} */ (invoiceLookups?.payment_term),
    );
    return mergeLookupOptions(
      ...(preferSealed ? [invoiceOption, customerOption] : [customerOption, invoiceOption]),
    );
  }, [customerDetail?.payment_term, invoiceLookups?.payment_term, preferSealed]);

  const salesmanOptions = useMemo(() => {
    const customerOption = salesInvoiceSalesmanOption(
      /** @type {Record<string, unknown> | null} */ (customerDetail?.salesman),
    );
    const invoiceOption = salesInvoiceSalesmanOption(
      /** @type {Record<string, unknown> | null} */ (invoiceLookups?.salesman),
    );
    return mergeLookupOptions(
      ...(preferSealed ? [invoiceOption, customerOption] : [customerOption, invoiceOption]),
    );
  }, [customerDetail?.salesman, invoiceLookups?.salesman, preferSealed]);

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
    customerSeedOptions,
    currencyOptions,
    paymentMethodOptions,
    paymentTermOptions,
    salesmanOptions,
    primaryCurrencyId,
    pairRateToPrimary,
    customerDetail,
    customerDetailPending: customerLookupsPending,
    warehousesPending: warehousesQuery.isPending,
    currenciesPending: currenciesQuery.isPending,
    paymentMethodsPending: customerLookupsPending,
    paymentTermsPending: customerLookupsPending,
    salesmenPending: customerLookupsPending,
  };
}

/**
 * @param {{ itemId?: string; t: (key: string) => string; enabled?: boolean }} args
 */
export function useSalesInvoiceLineUomOptions({ itemId, t, enabled = true }) {
  const itemReady = enabled && itemId != null && itemId !== "";

  const lineSetupQuery = useQuery({
    queryKey: itemInvoiceLineSetupQueryKey(itemId ?? ""),
    queryFn: () => fetchItemInvoiceLineSetup(itemId),
    enabled: itemReady,
    staleTime: QUERY_STALE_TIME.default,
  });

  const options = useMemo(() => {
    const rows = Array.isArray(lineSetupQuery.data?.item_uoms) ? lineSetupQuery.data.item_uoms : [];
    /** @type {{ value: number | string; label: import("react").ReactNode; searchText?: string; conversion_factor?: unknown; selling_price?: number | null; barcode?: string; is_base?: boolean; is_default_sale?: boolean }[]} */
    const result = [];
    for (const row of rows) {
      const codeLabel = salesInvoiceUomCodeLabel(row?.uom) || `UOM #${row?.id ?? ""}`;
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
        barcode: typeof row.barcode === "string" ? row.barcode : "",
        is_base: isBase,
        is_default_sale: Boolean(row.is_default_sale),
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
