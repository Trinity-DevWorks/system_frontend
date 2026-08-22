import { tenantRequest } from "@/lib/axios";

/**
 * Current authenticated tenant user (`GET` / `PUT auth/me`).
 */

/** @returns {Promise<Record<string, unknown>>} */
export async function fetchAuthMe() {
  const data = await tenantRequest("GET", "auth/me");
  return data && typeof data === "object" && !Array.isArray(data)
    ? /** @type {Record<string, unknown>} */ (data)
    : {};
}

/**
 * @param {{
 *   name: string;
 *   phone?: string | null;
 *   current_password?: string | null;
 *   password?: string | null;
 *   password_confirmation?: string | null;
 *   preferred_branch_id?: number | null;
 * }} body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateAuthMe(body) {
  const data = await tenantRequest("PUT", "auth/me", body);
  return data && typeof data === "object" && !Array.isArray(data)
    ? /** @type {Record<string, unknown>} */ (data)
    : {};
}
