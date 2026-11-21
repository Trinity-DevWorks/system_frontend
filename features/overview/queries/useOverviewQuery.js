"use client";

import { getActiveBranchId, useActiveBranchId } from "@/lib/active-branch";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchTenantOverview } from "../api/overview.api";
import { overviewQueryKey } from "./overviewQueryKeys";

export function useTenantOverviewQuery() {
  const branchId = useActiveBranchId();
  const cookieBranchId = getActiveBranchId();
  // Hydration reports no branch while the cookie is already set. Wait for that
  // snapshot so the first request is for the branch the header is showing.
  const branchReady = branchId != null || cookieBranchId == null;

  return useQuery({
    queryKey: overviewQueryKey(branchId ?? cookieBranchId),
    queryFn: fetchTenantOverview,
    enabled: branchReady,
    placeholderData: keepPreviousData,
    staleTime: QUERY_STALE_TIME.ledger,
  });
}
