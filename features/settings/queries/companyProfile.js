/**
 * Company profile (identity / branding).
 * Aligns with GET/PUT company-profile.
 */

import { fetchCompanyProfile } from "../api/companyProfile.api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * @typedef {{ id: string, file_name: string, mime_type: string }} CompanyLogoBrief
 */

/**
 * @typedef {object} CompanyProfile
 * @property {string | null} id
 * @property {string} company_name
 * @property {string | null} legal_name
 * @property {string | null} phone
 * @property {string | null} email
 * @property {string | null} website
 * @property {string | null} tax_number
 * @property {string | null} registration_number
 * @property {string | null} address
 * @property {CompanyLogoBrief | null} logo
 * @property {string | null} created_at
 * @property {string | null} updated_at
 */

/** @type {CompanyProfile} */
export const DEFAULT_COMPANY_PROFILE = {
  id: null,
  company_name: "",
  legal_name: null,
  phone: null,
  email: null,
  website: null,
  tax_number: null,
  registration_number: null,
  address: null,
  logo: null,
  created_at: null,
  updated_at: null,
};

export function companyProfileQueryKey(hostname) {
  return ["company-profile", hostname];
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function nullableString(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

/**
 * @param {unknown} payload
 * @returns {CompanyProfile}
 */
export function normalizeCompanyProfile(payload) {
  const raw =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? /** @type {Record<string, unknown>} */ (payload)
      : {};

  const logoRaw = raw.logo;
  /** @type {CompanyLogoBrief | null} */
  let logo = null;
  if (logoRaw && typeof logoRaw === "object" && !Array.isArray(logoRaw)) {
    const brief = /** @type {Record<string, unknown>} */ (logoRaw);
    const id = nullableString(brief.id);
    if (id) {
      logo = {
        id,
        file_name: nullableString(brief.file_name) ?? "",
        mime_type: nullableString(brief.mime_type) ?? "",
      };
    }
  }

  return {
    id: nullableString(raw.id),
    company_name:
      typeof raw.company_name === "string" ? raw.company_name : "",
    legal_name: nullableString(raw.legal_name),
    phone: nullableString(raw.phone),
    email: nullableString(raw.email),
    website: nullableString(raw.website),
    tax_number: nullableString(raw.tax_number),
    registration_number: nullableString(raw.registration_number),
    address: nullableString(raw.address),
    logo,
    created_at: nullableString(raw.created_at),
    updated_at: nullableString(raw.updated_at),
  };
}

/**
 * Fetch + cache the singleton company profile for the current host.
 */
export function useCompanyProfile() {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  const query = useQuery({
    queryKey: companyProfileQueryKey(hostname),
    queryFn: fetchCompanyProfile,
    enabled: Boolean(hostname),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const profile = useMemo(
    () =>
      query.data != null
        ? normalizeCompanyProfile(query.data)
        : DEFAULT_COMPANY_PROFILE,
    [query.data],
  );

  return {
    profile,
    raw: query.data,
    isLoading: query.isPending && query.data == null,
    isError: query.isError,
    isReady: query.data != null,
    refetch: query.refetch,
    queryKey: companyProfileQueryKey(hostname),
  };
}
