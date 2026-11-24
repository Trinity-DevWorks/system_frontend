"use client";

import {
  DEFAULT_PLATFORM_BRANDING,
  normalizePlatformBranding,
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
 * Platform name and logo. Never refetched from the browser (tenant hosts must not
 * call the central host); central saves push updates through `setPlatformBranding`.
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
  };
}

/**
 * Push a saved `platform-settings` payload into the shell (sidebar, titles) without a refetch.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {unknown} branding
 */
export function setPlatformBranding(queryClient, branding) {
  queryClient.setQueryData(PLATFORM_BRANDING_QUERY_KEY, normalizePlatformBranding(branding));
}
