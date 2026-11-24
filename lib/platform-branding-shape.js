import { getCentralApiUrl } from "@/lib/config";

/**
 * @typedef {{
 *   name: string,
 *   has_logo: boolean,
 *   logo_version: number | null,
 * }} PlatformBranding
 */

export const DEFAULT_PLATFORM_NAME = "MEASolutions";

export const FALLBACK_PLATFORM_LOGO = "/brand/mea-solutions-logo.png";

/** @type {PlatformBranding} */
export const DEFAULT_PLATFORM_BRANDING = Object.freeze({
  name: DEFAULT_PLATFORM_NAME,
  has_logo: false,
  logo_version: null,
});

/**
 * @param {unknown} raw `branding` / `platform-settings` API payload
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
