/**
 * Tenant plan + usage (GET tenant/subscription).
 */

import { fetchTenantSubscription } from "../api/subscription.api";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";

/** @param {string} hostname */
export function tenantSubscriptionQueryKey(hostname) {
  return ["tenant", "subscription", hostname];
}

export function useTenantSubscription() {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  return useQuery({
    queryKey: tenantSubscriptionQueryKey(hostname),
    queryFn: fetchTenantSubscription,
    enabled: Boolean(hostname),
    // Usage changes as users / branches / files are added; refresh when the page is opened.
    staleTime: QUERY_STALE_TIME.default,
    retry: 1,
  });
}
