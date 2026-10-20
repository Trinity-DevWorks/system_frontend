"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { BRANCH_CONTEXT_QUERY_KEY } from "@/lib/active-branch";
import { fetchBranchContext } from "@/lib/api/branchContext";
import { useQuery } from "@tanstack/react-query";

/**
 * Branch filter shared by the ledger reports.
 * One accessible branch is selected and locked. Several branches keep the caller's choice,
 * and an empty choice means the branches that user may see.
 *
 * @param {number | undefined} requestedBranchId
 */
export function useReportBranch(requestedBranchId) {
  const branchContext = useQuery({
    queryKey: BRANCH_CONTEXT_QUERY_KEY,
    queryFn: fetchBranchContext,
    staleTime: QUERY_STALE_TIME.ledger,
  });
  const accessibleBranches = (Array.isArray(branchContext.data?.accessible_branches)
    ? branchContext.data.accessible_branches
    : []
  ).filter((branch) => branch.is_active !== false);
  const lockedBranchId = accessibleBranches.length === 1 ? Number(accessibleBranches[0].id) : undefined;
  const requested = requestedBranchId == null || !Number.isFinite(Number(requestedBranchId))
    ? undefined
    : Number(requestedBranchId);
  const selectedBranchId = lockedBranchId ?? requested;

  return {
    accessibleBranches,
    lockedBranchId,
    selectedBranchId,
    isPending: branchContext.isPending,
    isFetched: branchContext.isFetched,
  };
}
