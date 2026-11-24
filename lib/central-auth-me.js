"use client";

import { fetchCentralAuthMe } from "@/lib/api/centralAuthMe";
import { syncLocalPreferenceUserId } from "@/lib/local-preference-scope";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect } from "react";

export const CENTRAL_AUTH_ME_QUERY_KEY = /** @type {const} */ (["central", "auth-me"]);

/**
 * Logged-in central (platform) user profile (`/api/auth/me`), including the
 * central permission matrix.
 */
export function useCentralAuthMe() {
  const query = useQuery({
    queryKey: CENTRAL_AUTH_ME_QUERY_KEY,
    queryFn: fetchCentralAuthMe,
    staleTime: QUERY_STALE_TIME.default,
    retry: 1,
  });

  const me =
    query.data && typeof query.data === "object" ? query.data : null;

  useLayoutEffect(() => {
    syncLocalPreferenceUserId(me);
  }, [me]);

  return {
    me,
    isLoading: query.isPending && query.data == null,
    isError: query.isError,
    isReady: query.data != null,
    refetch: query.refetch,
    queryKey: CENTRAL_AUTH_ME_QUERY_KEY,
  };
}
