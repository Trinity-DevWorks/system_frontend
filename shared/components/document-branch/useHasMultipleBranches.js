"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { BRANCH_CONTEXT_QUERY_KEY } from "@/lib/active-branch";
import { fetchBranchContext } from "@/lib/api/branchContext";
import { useQuery } from "@tanstack/react-query";

/**
 * True when the user works with more than one branch. Document branch columns and tags are
 * hidden for single-branch tenants, where they would only repeat the same name.
 */
export function useHasMultipleBranches() {
  const branchContext = useQuery({
    queryKey: BRANCH_CONTEXT_QUERY_KEY,
    queryFn: fetchBranchContext,
    staleTime: QUERY_STALE_TIME.ledger,
  });
  const branches = Array.isArray(branchContext.data?.accessible_branches)
    ? branchContext.data.accessible_branches
    : [];

  return branches.length > 1;
}

/**
 * @param {unknown} branch
 * @returns {string}
 */
export function documentBranchName(branch) {
  if (!branch || typeof branch !== "object") return "";
  const row = /** @type {{ name?: unknown; shortcut_name?: unknown }} */ (branch);
  return String(row.name ?? row.shortcut_name ?? "").trim();
}
