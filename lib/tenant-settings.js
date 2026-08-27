/**
 * Tenant operational settings (locale defaults + business flags).
 * Aligns with GET/PUT tenant-settings.
 */

import { isInventoryCostingMethod } from "@/lib/inventory-costing";
import { fetchTenantSettings } from "@/lib/api/tenantSettings";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { setTenantFormatSettings } from "@/lib/tenant-format-runtime";

/** @typedef {'en' | 'ar'} PreferredLanguage */
/** @typedef {'Y-m-d' | 'd/m/Y' | 'm/d/Y' | 'd-m-Y' | 'd.m.Y'} DateFormat */
/** @typedef {'comma_dot' | 'dot_comma' | 'space_dot' | 'space_comma'} NumberFormat */
/** @typedef {'half_up' | 'half_even' | 'up' | 'down'} PriceRoundingMode */
/** @typedef {'exclusive' | 'inclusive'} TaxPriceMode */
/** @typedef {'standard' | 'fifo' | 'moving_average' | 'actual'} InventoryCostingMethod */

/**
 * @typedef {object} TenantSettings
 * @property {number | null} id
 * @property {number | null} primaryCurrencyId
 * @property {string | null} country
 * @property {PreferredLanguage} preferredLanguage
 * @property {string} timezone
 * @property {DateFormat} dateFormat
 * @property {NumberFormat} numberFormat
 * @property {boolean} taxEnabled
 * @property {TaxPriceMode} taxPriceMode
 * @property {boolean} allowNegativeStock
 * @property {InventoryCostingMethod} inventoryCostingMethod
 * @property {PriceRoundingMode} priceRoundingMode
 * @property {number} priceDecimalPlaces
 */

/** @type {TenantSettings} */
export const DEFAULT_TENANT_SETTINGS = {
  id: null,
  primaryCurrencyId: null,
  country: null,
  preferredLanguage: "en",
  timezone: "UTC",
  dateFormat: "Y-m-d",
  numberFormat: "comma_dot",
  taxEnabled: true,
  taxPriceMode: "exclusive",
  allowNegativeStock: false,
  inventoryCostingMethod: "moving_average",
  priceRoundingMode: "half_up",
  priceDecimalPlaces: 2,
};

export function tenantSettingsQueryKey(hostname) {
  return ["tenant", "tenant-settings", hostname];
}

/**
 * @param {unknown} payload
 * @returns {TenantSettings}
 */
export function normalizeTenantSettings(payload) {
  const raw =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? /** @type {Record<string, unknown>} */ (payload)
      : {};

  const preferredLanguage =
    raw.preferred_language === "ar" || raw.preferred_language === "en"
      ? raw.preferred_language
      : DEFAULT_TENANT_SETTINGS.preferredLanguage;

  const dateFormat = isDateFormat(raw.date_format)
    ? raw.date_format
    : DEFAULT_TENANT_SETTINGS.dateFormat;

  const numberFormat = isNumberFormat(raw.number_format)
    ? raw.number_format
    : DEFAULT_TENANT_SETTINGS.numberFormat;

  const priceRoundingMode = isPriceRoundingMode(raw.price_rounding_mode)
    ? raw.price_rounding_mode
    : DEFAULT_TENANT_SETTINGS.priceRoundingMode;

  const decimals = Number(raw.price_decimal_places);
  const priceDecimalPlaces =
    Number.isInteger(decimals) && decimals >= 0 && decimals <= 6
      ? decimals
      : DEFAULT_TENANT_SETTINGS.priceDecimalPlaces;

  const timezone =
    typeof raw.timezone === "string" && raw.timezone.trim()
      ? raw.timezone.trim()
      : DEFAULT_TENANT_SETTINGS.timezone;

  return {
    id: raw.id != null ? Number(raw.id) : null,
    primaryCurrencyId:
      raw.primary_currency_id != null ? Number(raw.primary_currency_id) : null,
    country:
      typeof raw.country === "string" && raw.country.trim()
        ? raw.country.trim().toUpperCase()
        : null,
    preferredLanguage,
    timezone,
    dateFormat,
    numberFormat,
    taxEnabled:
      raw.tax_enabled == null
        ? DEFAULT_TENANT_SETTINGS.taxEnabled
        : Boolean(raw.tax_enabled),
    taxPriceMode: isTaxPriceMode(raw.tax_price_mode)
      ? raw.tax_price_mode
      : DEFAULT_TENANT_SETTINGS.taxPriceMode,
    allowNegativeStock:
      raw.allow_negative_stock == null
        ? DEFAULT_TENANT_SETTINGS.allowNegativeStock
        : Boolean(raw.allow_negative_stock),
    inventoryCostingMethod: isInventoryCostingMethod(raw.inventory_costing_method)
      ? raw.inventory_costing_method
      : DEFAULT_TENANT_SETTINGS.inventoryCostingMethod,
    priceRoundingMode,
    priceDecimalPlaces,
  };
}

/**
 * Fetch + cache tenant settings for the current host.
 * Syncs format runtime so table helpers read the latest values.
 */
export function useTenantSettings() {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  const query = useQuery({
    queryKey: tenantSettingsQueryKey(hostname),
    queryFn: fetchTenantSettings,
    enabled: Boolean(hostname),
    // Rarely changes; invalidate explicitly after PUT on the settings page.
    staleTime: QUERY_STALE_TIME.infinite,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const settings = useMemo(
    () =>
      query.data != null
        ? normalizeTenantSettings(query.data)
        : DEFAULT_TENANT_SETTINGS,
    [query.data],
  );

  useEffect(() => {
    setTenantFormatSettings(settings);
  }, [settings]);

  return {
    settings,
    raw: query.data ?? null,
    isLoading: query.isPending && query.data == null,
    isError: query.isError,
    isReady: query.data != null,
    refetch: query.refetch,
  };
}

/** @param {unknown} value @returns {value is DateFormat} */
function isDateFormat(value) {
  return (
    value === "Y-m-d" ||
    value === "d/m/Y" ||
    value === "m/d/Y" ||
    value === "d-m-Y" ||
    value === "d.m.Y"
  );
}

/** @param {unknown} value @returns {value is NumberFormat} */
function isNumberFormat(value) {
  return (
    value === "comma_dot" ||
    value === "dot_comma" ||
    value === "space_dot" ||
    value === "space_comma"
  );
}

/** @param {unknown} value @returns {value is PriceRoundingMode} */
function isPriceRoundingMode(value) {
  return (
    value === "half_up" ||
    value === "half_even" ||
    value === "up" ||
    value === "down"
  );
}

/** @param {unknown} value @returns {value is TaxPriceMode} */
function isTaxPriceMode(value) {
  return value === "exclusive" || value === "inclusive";
}

/**
 * Catalog prices already include VAT. False when tax is off, regardless of mode.
 *
 * @param {TenantSettings | null | undefined} settings
 */
export function tenantPricesIncludeTax(settings) {
  return Boolean(settings?.taxEnabled) && settings?.taxPriceMode === "inclusive";
}
