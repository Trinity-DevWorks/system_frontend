/**
 * Active branch cookie for tenant API scoping (X-Branch-Id).
 */
import Cookies from "js-cookie";

export const ACTIVE_BRANCH_COOKIE_KEY =
  process.env.NEXT_PUBLIC_ACTIVE_BRANCH_KEY || "tenant_active_branch_id";

export const BRANCH_CONTEXT_QUERY_KEY = /** @type {const} */ (["tenant", "branch-context"]);

const cookieOptions = {
  expires: 7,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

const cookieRemovalOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

/** @returns {number | null} */
export function getActiveBranchId() {
  if (typeof window === "undefined") return null;
  const raw = Cookies.get(ACTIVE_BRANCH_COOKIE_KEY);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** @param {number | string | null | undefined} branchId */
export function setActiveBranchId(branchId) {
  if (branchId == null || branchId === "") {
    clearActiveBranchId();
    return;
  }
  const n = Number(branchId);
  if (!Number.isFinite(n) || n <= 0) {
    clearActiveBranchId();
    return;
  }
  Cookies.set(ACTIVE_BRANCH_COOKIE_KEY, String(n), cookieOptions);
}

export function clearActiveBranchId() {
  Cookies.remove(ACTIVE_BRANCH_COOKIE_KEY, cookieRemovalOptions);
}
