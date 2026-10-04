"use client";

import {
  DEFAULT_PLATFORM_BRANDING,
  normalizePlatformBranding,
  normalizePlatformRegional,
  platformLogoUrl,
} from "@/lib/platform-branding-shape";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

export const PLATFORM_BRANDING_QUERY_KEY = ["platform", "branding"];

const InitialBrandingContext = createContext(DEFAULT_PLATFORM_BRANDING);

/**
 * Seeds platform branding fetched by the locale layout on the server.
 *
 * @param {{ initialBranding: import("@/lib/platform-branding-shape").PlatformBranding, children: import("react").ReactNode }} props
 */
export function PlatformBrandingProvider({ initialBranding, children }) {
  return (
    <InitialBrandingContext.Provider value={initialBranding ?? DEFAULT_PLATFORM_BRANDING}>
      {children}
    </InitialBrandingContext.Provider>
  );
}

/**
 * Platform name, logo, and regional formats. Never refetched from the browser (tenant hosts must not
 * call the central host); central saves push updates through the setters below.
 */
export function usePlatformBranding() {
  const initialBranding = useContext(InitialBrandingContext);
  const { data } = useQuery({
    queryKey: PLATFORM_BRANDING_QUERY_KEY,
    queryFn: () => initialBranding,
    initialData: initialBranding,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const branding = data ?? initialBranding;

  return {
    name: branding.name,
    hasLogo: branding.has_logo,
    logoUrl: platformLogoUrl(branding),
    regional: branding.regional,
  };
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {(current: import("@/lib/platform-branding-shape").PlatformBranding) => Record<string, unknown>} patch
 */
function patchPlatformBranding(queryClient, patch) {
  queryClient.setQueryData(PLATFORM_BRANDING_QUERY_KEY, (current) => {
    const base = normalizePlatformBranding(current ?? DEFAULT_PLATFORM_BRANDING);
    return normalizePlatformBranding({ ...base, ...patch(base) });
  });
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {{ name?: string, logo?: { version?: number | null } | null } | null | undefined} profile platform-profile payload
 */
export function setPlatformBrandingFromProfile(queryClient, profile) {
  const version = profile?.logo?.version ?? null;
  patchPlatformBranding(queryClient, () => ({
    name: profile?.name,
    has_logo: version !== null,
    logo_version: version,
  }));
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {Record<string, unknown> | null | undefined} settings platform-settings payload
 */
export function setPlatformBrandingFromSettings(queryClient, settings) {
  patchPlatformBranding(queryClient, () => ({
    regional: normalizePlatformRegional(settings),
  }));
}
