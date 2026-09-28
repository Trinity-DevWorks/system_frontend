import { centralRequest } from "@/lib/axios";

/**
 * Current authenticated central (platform) user (`GET` / `PUT /api/auth/me`).
 */

/** @returns {Promise<Record<string, unknown>>} */
export async function fetchCentralAuthMe() {
  const data = await centralRequest("GET", "auth/me");
  return data && typeof data === "object" && !Array.isArray(data)
    ? /** @type {Record<string, unknown>} */ (data)
    : {};
}

/**
 * @param {{
 *   name: string;
 *   current_password?: string | null;
 *   password?: string | null;
 *   password_confirmation?: string | null;
 * }} body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateCentralAuthMe(body) {
  const data = await centralRequest("PUT", "auth/me", body);
  return data && typeof data === "object" && !Array.isArray(data)
    ? /** @type {Record<string, unknown>} */ (data)
    : {};
}
