"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { fetchPlatformProfile, fetchPlatformSettings } from "../api/platformSettings.api";
import { PLATFORM_PROFILE_QUERY_KEY, PLATFORM_SETTINGS_QUERY_KEY } from "./platformSettingsQueryKeys";

export function usePlatformProfileQuery() {
  return useQuery({
    queryKey: PLATFORM_PROFILE_QUERY_KEY,
    queryFn: fetchPlatformProfile,
    staleTime: QUERY_STALE_TIME.default,
  });
}

export function usePlatformSettingsQuery() {
  return useQuery({
    queryKey: PLATFORM_SETTINGS_QUERY_KEY,
    queryFn: fetchPlatformSettings,
    staleTime: QUERY_STALE_TIME.default,
  });
}
