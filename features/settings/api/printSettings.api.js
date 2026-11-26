import { tenantRequest } from "@/lib/axios";

export const PRINT_SETTINGS_QUERY_KEY = /** @type {const} */ (["tenant", "print-settings"]);

/**
 * Company default (top-level fields), per-document-type overrides, and the printable types.
 * @returns {Promise<Record<string, any>>}
 */
export async function fetchPrintSettings() {
  const data = await tenantRequest("GET", "print-settings");
  return data && typeof data === "object" ? data : {};
}

/** Save the company default. @param {Record<string, unknown>} values */
export function updatePrintSettings(values) {
  return tenantRequest("PUT", "print-settings", values);
}

/** Create or replace one document type's own settings. */
export function updatePrintSettingsType(/** @type {string} */ type, /** @type {Record<string, unknown>} */ values) {
  return tenantRequest("PUT", `print-settings/types/${encodeURIComponent(type)}`, values);
}

/** Remove a document type's own settings: it uses the company default again. */
export function deletePrintSettingsType(/** @type {string} */ type) {
  return tenantRequest("DELETE", `print-settings/types/${encodeURIComponent(type)}`);
}
