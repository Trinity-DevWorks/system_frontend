import { tenantApiClient, tenantRequest } from "@/lib/axios";
import { getApiErrorDisplay } from "@/lib/api-envelope";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

export const SCALE_EXPORT_TEMPLATES_QUERY_KEY = /** @type {const} */ (["tenant", "scale-export-templates"]);
export const SCALE_EXPORTS_QUERY_KEY = /** @type {const} */ (["tenant", "scale-exports"]);
export const SCALE_EXPORT_STATUS_QUERY_KEY = /** @type {const} */ (["tenant", "scale-exports", "outdated"]);

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchScaleExportTemplates(params = {}) {
  return fetchPaginatedResource("scale-export-templates", params);
}

/** @param {number | string} id */
export function fetchScaleExportTemplate(id) {
  return tenantRequest("GET", `scale-export-templates/${encodeURIComponent(String(id))}`);
}

/** @param {Record<string, unknown>} body */
export function createScaleExportTemplate(body) {
  return tenantRequest("POST", "scale-export-templates", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 */
export function updateScaleExportTemplate(id, body) {
  return tenantRequest("PUT", `scale-export-templates/${encodeURIComponent(String(id))}`, body);
}

/** @param {number | string} id */
export function deleteScaleExportTemplate(id) {
  return tenantRequest("DELETE", `scale-export-templates/${encodeURIComponent(String(id))}`);
}

/** First rows the (unsaved) template would write. @param {Record<string, unknown>} body */
export function previewScaleExportDraft(body) {
  return tenantRequest("POST", "scale-export-templates/preview", body);
}

/**
 * @param {number | string} id
 * @param {boolean} onlyChanged
 */
export function previewScaleExport(id, onlyChanged) {
  return tenantRequest("GET", `scale-export-templates/${encodeURIComponent(String(id))}/preview${onlyChanged ? "?only_changed=1" : ""}`);
}

/** Templates with their last export and how many items changed since. */
export function fetchScaleExportStatus() {
  return tenantRequest("GET", "scale-exports/outdated");
}

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchScaleExports(params = {}) {
  return fetchPaginatedResource("scale-exports", params);
}

/** @param {number | string} id */
export function fetchScaleExport(id) {
  return tenantRequest("GET", `scale-exports/${encodeURIComponent(String(id))}`);
}

/**
 * JSON error inside a blob response → the same error shape as other API calls (code + params).
 *
 * @param {Blob} blob
 */
export async function errorFromBlob(blob) {
  try {
    const { message, code, errors, params } = getApiErrorDisplay(JSON.parse(await blob.text()));
    const error = new Error(code ? "Request failed" : message);
    error.details = { code, errors, params };
    return error;
  } catch {
    const error = new Error("Request failed");
    error.details = {};
    return error;
  }
}

/**
 * POST that returns a file. Throws API errors with code/params like tenantRequest.
 *
 * @param {string} url
 * @param {Record<string, unknown>} [body]
 * @returns {Promise<{ blob: Blob; filename: string | null }>}
 */
export async function postForBlob(url, body = {}) {
  try {
    const response = await tenantApiClient.post(url, body, { responseType: "blob", timeout: 120_000 });
    const blob = response.data;
    if (!(blob instanceof Blob)) throw new Error("Request failed");
    if (String(blob.type).includes("json")) throw await errorFromBlob(blob);
    const disposition = String(response.headers?.["content-disposition"] ?? "");
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    return { blob, filename: match ? decodeURIComponent(match[1]) : null };
  } catch (error) {
    const details = error && typeof error === "object" && "details" in error ? error.details : null;
    if (details instanceof Blob) throw await errorFromBlob(details);
    const data = error && typeof error === "object" && "response" in error ? error.response?.data : null;
    if (data instanceof Blob) throw await errorFromBlob(data);
    throw error;
  }
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads the scale file and records it in the history.
 *
 * @param {number | string} id
 * @param {boolean} onlyChanged
 */
export async function downloadScaleExport(id, onlyChanged) {
  const { blob, filename } = await postForBlob(
    `scale-export-templates/${encodeURIComponent(String(id))}/download${onlyChanged ? "?only_changed=1" : ""}`,
  );
  saveBlob(blob, filename ?? "scale-items.csv");
}
