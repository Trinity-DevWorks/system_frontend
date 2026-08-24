"use client";

import { fetchAuthMe } from "@/lib/api/authMe";
import { syncLocalPreferenceUserId } from "@/lib/local-preference-scope";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect } from "react";

export const AUTH_ME_QUERY_KEY = /** @type {const} */ (["tenant", "auth-me"]);

/**
 * Merge `permissions` onto the cached `auth/me` record (login, branch switch).
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {unknown} permissions
 */
export function applyAuthMePermissions(queryClient, permissions) {
  queryClient.setQueryData(AUTH_ME_QUERY_KEY, (old) => {
    const base = old && typeof old === "object" ? /** @type {Record<string, unknown>} */ (old) : {};
    return { ...base, permissions };
  });
}

/**
 * Logged-in tenant user profile (`auth/me`).
 */
export function useAuthMe() {
  const query = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: fetchAuthMe,
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
    queryKey: AUTH_ME_QUERY_KEY,
  };
}
