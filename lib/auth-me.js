"use client";

import { fetchAuthMe } from "@/services/authMeApi";
import { useQuery } from "@tanstack/react-query";

export const AUTH_ME_QUERY_KEY = /** @type {const} */ (["tenant", "auth-me"]);

/**
 * Logged-in tenant user profile (`auth/me`).
 */
export function useAuthMe() {
  const query = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: fetchAuthMe,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const me =
    query.data && typeof query.data === "object" ? query.data : null;

  return {
    me,
    isLoading: query.isPending && query.data == null,
    isError: query.isError,
    isReady: query.data != null,
    refetch: query.refetch,
    queryKey: AUTH_ME_QUERY_KEY,
  };
}
