"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { fetchCountries } from "../api/countries.api";
import { countriesQueryKey } from "./countriesQueryKeys";

/**
 * @typedef {{ code: string, name: string }} CountryOption
 */

/**
 * @param {unknown} payload
 * @returns {CountryOption[]}
 */
export function normalizeCountries(payload) {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = /** @type {Record<string, unknown>} */ (row);
    const code = typeof item.code === "string" ? item.code.trim().toUpperCase() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!/^[A-Z]{2}$/.test(code) || !name) return [];
    return [{ code, name }];
  });
}

/**
 * Localized ISO country catalog for searchable selects.
 */
export function useCountriesQuery() {
  const locale = useLocale();
  const catalogLocale = locale === "ar" ? "ar" : "en";

  const query = useQuery({
    queryKey: countriesQueryKey(catalogLocale),
    queryFn: () => fetchCountries(catalogLocale),
    staleTime: QUERY_STALE_TIME.lookup,
  });

  return {
    ...query,
    countries: normalizeCountries(query.data),
  };
}
