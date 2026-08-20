/**
 * Company operational settings (locale defaults + business flags).
 * Aligns with GET/PUT company-settings.
 */

import { fetchCompanySettings } from "@/services/companySettingsApi";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { setTenantFormatSettings } from "@/lib/tenant-format-runtime";

/** @typedef {'en' | 'ar'} PreferredLanguage */
/** @typedef {'Y-m-d' | 'd/m/Y' | 'm/d/Y' | 'd-m-Y' | 'd.m.Y'} DateFormat */
/** @typedef {'comma_dot' | 'dot_comma' | 'space_dot' | 'space_comma'} NumberFormat */
/** @typedef {'half_up' | 'half_even' | 'up' | 'down'} PriceRoundingMode */

/**
 * @typedef {object} CompanySettings
 * @property {number | null} id
 * @property {number | null} primaryCurrencyId
 * @property {string | null} country
 * @property {PreferredLanguage} preferredLanguage
 * @property {string} timezone
 * @property {DateFormat} dateFormat
 * @property {NumberFormat} numberFormat
 * @property {boolean} taxEnabled
 * @property {boolean} allowNegativeStock
 * @property {PriceRoundingMode} priceRoundingMode
 * @property {number} priceDecimalPlaces
 */

/** @type {CompanySettings} */
export const DEFAULT_COMPANY_SETTINGS = {
  id: null,
  primaryCurrencyId: null,
  country: null,
  preferredLanguage: "en",
  timezone: "UTC",
  dateFormat: "Y-m-d",
  numberFormat: "comma_dot",
  taxEnabled: true,
  allowNegativeStock: false,
  priceRoundingMode: "half_up",
  priceDecimalPlaces: 2,
};

export function companySettingsQueryKey(hostname) {
  return ["company-settings", hostname];
}

/**
 * @param {unknown} payload
 * @returns {CompanySettings}
 */
export function normalizeCompanySettings(payload) {
  const raw =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? /** @type {Record<string, unknown>} */ (payload)
      : {};

  const preferredLanguage =
    raw.preferred_language === "ar" || raw.preferred_language === "en"
      ? raw.preferred_language
      : DEFAULT_COMPANY_SETTINGS.preferredLanguage;

  const dateFormat = isDateFormat(raw.date_format)
    ? raw.date_format
    : DEFAULT_COMPANY_SETTINGS.dateFormat;

  const numberFormat = isNumberFormat(raw.number_format)
    ? raw.number_format
    : DEFAULT_COMPANY_SETTINGS.numberFormat;

  const priceRoundingMode = isPriceRoundingMode(raw.price_rounding_mode)
    ? raw.price_rounding_mode
    : DEFAULT_COMPANY_SETTINGS.priceRoundingMode;

  const decimals = Number(raw.price_decimal_places);
  const priceDecimalPlaces =
    Number.isInteger(decimals) && decimals >= 0 && decimals <= 6
      ? decimals
      : DEFAULT_COMPANY_SETTINGS.priceDecimalPlaces;

  const timezone =
    typeof raw.timezone === "string" && raw.timezone.trim()
      ? raw.timezone.trim()
      : DEFAULT_COMPANY_SETTINGS.timezone;

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
        ? DEFAULT_COMPANY_SETTINGS.taxEnabled
        : Boolean(raw.tax_enabled),
    allowNegativeStock:
      raw.allow_negative_stock == null
        ? DEFAULT_COMPANY_SETTINGS.allowNegativeStock
        : Boolean(raw.allow_negative_stock),
    priceRoundingMode,
    priceDecimalPlaces,
  };
}

/**
 * Fetch + cache company settings for the current host.
 * Syncs format runtime so table helpers read the latest values.
 */
export function useCompanySettings() {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  const query = useQuery({
    queryKey: companySettingsQueryKey(hostname),
    queryFn: fetchCompanySettings,
    enabled: Boolean(hostname),
    // Rarely changes; invalidate explicitly after PUT on the settings page.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const settings = useMemo(
    () =>
      query.data != null
        ? normalizeCompanySettings(query.data)
        : DEFAULT_COMPANY_SETTINGS,
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
