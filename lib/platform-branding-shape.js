import { getCentralApiUrl } from "@/lib/config";

/**
 * @typedef {{
 *   preferred_language: string,
 *   timezone: string,
 *   date_format: string,
 *   number_format: string,
 * }} PlatformRegional
 * @typedef {{
 *   name: string,
 *   has_logo: boolean,
 *   logo_version: number | null,
 *   regional: PlatformRegional,
 * }} PlatformBranding
 */

export const DEFAULT_PLATFORM_NAME = "MENA";

export const FALLBACK_PLATFORM_LOGO = "/brand/erp-logo.png";

/** @type {PlatformRegional} */
export const DEFAULT_PLATFORM_REGIONAL = Object.freeze({
  preferred_language: "en",
  timezone: "UTC",
  date_format: "Y-m-d",
  number_format: "comma_dot",
});

/** @type {PlatformBranding} */
export const DEFAULT_PLATFORM_BRANDING = Object.freeze({
  name: DEFAULT_PLATFORM_NAME,
  has_logo: false,
  logo_version: null,
  regional: DEFAULT_PLATFORM_REGIONAL,
});

/**
 * @param {unknown} raw
 * @returns {PlatformRegional}
 */
export function normalizePlatformRegional(raw) {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PLATFORM_REGIONAL;
  }
  const data = /** @type {Record<string, unknown>} */ (raw);
  const pick = (key) =>
    typeof data[key] === "string" && data[key] !== "" ? /** @type {string} */ (data[key]) : DEFAULT_PLATFORM_REGIONAL[key];

  return {
    preferred_language: pick("preferred_language"),
    timezone: pick("timezone"),
    date_format: pick("date_format"),
    number_format: pick("number_format"),
  };
}

/**
 * @param {unknown} raw
 * @returns {PlatformBranding}
 */
export function normalizePlatformBranding(raw) {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PLATFORM_BRANDING;
  }
  const data = /** @type {Record<string, unknown>} */ (raw);
  const name = typeof data.name === "string" && data.name.trim() !== "" ? data.name.trim() : DEFAULT_PLATFORM_NAME;
  const version = typeof data.logo_version === "number" ? data.logo_version : null;
  const hasLogo = data.has_logo === true && version !== null;

  return {
    name,
    has_logo: hasLogo,
    logo_version: hasLogo ? version : null,
    regional: normalizePlatformRegional(data.regional),
  };
}

/**
 * Public logo URL on the central API; `v` makes the browser cache safe across replacements.
 *
 * @param {PlatformBranding | null | undefined} branding
 * @returns {string | null}
 */
export function platformLogoUrl(branding) {
  if (!branding?.has_logo || branding.logo_version == null) {
    return null;
  }
  return getCentralApiUrl(`branding/logo?v=${branding.logo_version}`);
}
