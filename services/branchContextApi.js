import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<{
 *   active_branch_id: number | null;
 *   active_branch: { id: number; name: string; shortcut_name?: string | null; is_default?: boolean } | null;
 *   accessible_branches: Array<{ id: number; name: string; shortcut_name?: string | null; is_default?: boolean }>;
 *   is_owner: boolean;
 * }>}
 */
export async function fetchBranchContext() {
  const data = await tenantApiService("GET", "branch-context");
  return data && typeof data === "object" ? data : { active_branch_id: null, active_branch: null, accessible_branches: [], is_owner: false };
}

/**
 * @param {number} branchId
 */
export async function switchBranch(branchId) {
  return tenantApiService("POST", "branch-context/switch", { branch_id: Number(branchId) });
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchAuthMe() {
  const data = await tenantApiService("GET", "auth/me");
  return data && typeof data === "object" ? data : {};
}
