import { tenantRequest } from "@/lib/axios";

/**
 * ISO country catalog for company-settings (and later address pickers).
 * Aligns with GET countries?locale=en|ar
 *
 * @param {"en" | "ar"} [locale]
 * @returns {Promise<unknown>}
 */
export function fetchCountries(locale) {
  return tenantRequest("GET", "countries", null, {
    params: locale === "ar" || locale === "en" ? { locale } : {},
  });
}
