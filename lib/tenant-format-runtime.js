/**
 * Mutable format settings for non-React helpers (table column renderers).
 * Updated by useCompanySettings when data loads — formatters read at call time.
 */

/** @type {import("@/lib/company-settings").CompanySettings} */
const FALLBACK = {
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

/** @type {import("@/lib/company-settings").CompanySettings} */
let current = { ...FALLBACK };

/**
 * @param {import("@/lib/company-settings").CompanySettings} settings
 */
export function setTenantFormatSettings(settings) {
  current = settings ? { ...settings } : { ...FALLBACK };
}

/**
 * @returns {import("@/lib/company-settings").CompanySettings}
 */
export function getTenantFormatSettings() {
  return current;
}
