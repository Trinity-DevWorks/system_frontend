/**
 * Mutable format settings for non-React helpers (table column renderers).
 * Updated by useTenantSettings when data loads — formatters read at call time.
 */

/** @type {import("@/lib/tenant-settings").TenantSettings} */
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

/** @type {import("@/lib/tenant-settings").TenantSettings} */
let current = { ...FALLBACK };

/**
 * @param {import("@/lib/tenant-settings").TenantSettings} settings
 */
export function setTenantFormatSettings(settings) {
  current = settings ? { ...settings } : { ...FALLBACK };
}

/**
 * @returns {import("@/lib/tenant-settings").TenantSettings}
 */
export function getTenantFormatSettings() {
  return current;
}
