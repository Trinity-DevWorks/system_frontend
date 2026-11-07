import { tenantRequest } from "@/lib/axios";

export const DOCUMENT_NUMBERING_QUERY_KEY = /** @type {const} */ (["tenant", "document-number-settings"]);

/** @returns {Promise<Array<Record<string, any>>>} */
export async function fetchDocumentNumberSettings() {
  const data = await tenantRequest("GET", "document-number-settings");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {Array<{ document_type: string; prefix: string; include_branch: boolean; include_year: boolean; padding: number; start_number: number }>} settings
 */
export function updateDocumentNumberSettings(settings) {
  return tenantRequest("PUT", "document-number-settings", { settings });
}
