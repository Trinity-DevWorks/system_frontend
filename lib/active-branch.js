/**
 * Active branch cookie for tenant API scoping (X-Branch-Id).
 */
import Cookies from "js-cookie";
import { useSyncExternalStore } from "react";

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

/** Cookie writes have no subscription of their own. */
const activeBranchListeners = new Set();

function emitActiveBranchChange() {
  activeBranchListeners.forEach((listener) => listener());
}

/** @param {() => void} listener */
export function subscribeActiveBranchId(listener) {
  activeBranchListeners.add(listener);
  return () => activeBranchListeners.delete(listener);
}

/**
 * Active branch id. The server snapshot stays empty so hydration matches;
 * the client reads the cookie after mount and again on every switch.
 */
export function useActiveBranchId() {
  return useSyncExternalStore(subscribeActiveBranchId, getActiveBranchId, () => null);
}

/**
 * @param {number | string | null | undefined} branchId
 * @param {{ notify?: boolean }} [options] Pass `notify: false` when the caller
 * must clear branch-scoped caches before subscribers read the new id.
 */
export function setActiveBranchId(branchId, options = {}) {
  const notify = options.notify !== false;
  if (branchId == null || branchId === "") {
    Cookies.remove(ACTIVE_BRANCH_COOKIE_KEY, cookieRemovalOptions);
  } else {
    const n = Number(branchId);
    if (!Number.isFinite(n) || n <= 0) {
      Cookies.remove(ACTIVE_BRANCH_COOKIE_KEY, cookieRemovalOptions);
    } else {
      Cookies.set(ACTIVE_BRANCH_COOKIE_KEY, String(n), cookieOptions);
    }
  }
  if (notify) emitActiveBranchChange();
}

/** Tell subscribers the cookie already changed. Use after a quiet write plus cache reset. */
export function notifyActiveBranchId() {
  emitActiveBranchChange();
}

export function clearActiveBranchId() {
  setActiveBranchId(null);
}
