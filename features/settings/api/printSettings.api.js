import { tenantRequest } from "@/lib/axios";

export const PRINT_SETTINGS_QUERY_KEY = /** @type {const} */ (["tenant", "print-settings"]);

/** @returns {Promise<Record<string, any>>} */
export async function fetchPrintSettings() {
  const data = await tenantRequest("GET", "print-settings");
  return data && typeof data === "object" ? data : {};
}

/** @param {Record<string, unknown>} values */
export function updatePrintSettings(values) {
  return tenantRequest("PUT", "print-settings", values);
}
