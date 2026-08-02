/**
 * Stash API error codes across a hard redirect to login (e.g. ACCOUNT_INACTIVE).
 * Login consumes and shows the mapped ApiErrors.codes.* string.
 */

const STORAGE_KEY = "pending_auth_error_code";

/** @param {string | undefined | null} code */
export function stashPendingAuthErrorCode(code) {
  if (typeof window === "undefined") return;
  if (typeof code !== "string" || !code.trim()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, code.trim());
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** @returns {string | null} */
export function consumePendingAuthErrorCode() {
  if (typeof window === "undefined") return null;
  try {
    const code = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return typeof code === "string" && code.trim() ? code.trim() : null;
  } catch {
    return null;
  }
}
