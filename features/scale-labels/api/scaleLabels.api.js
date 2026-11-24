import { postForBlob } from "@/features/scale-exports/api/scaleExports.api";
import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

export const SCALE_LABEL_TEMPLATES_QUERY_KEY = /** @type {const} */ (["tenant", "scale-label-templates"]);

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchScaleLabelTemplates(params = {}) {
  return fetchPaginatedResource("scale-label-templates", params);
}

/** @param {number | string} id */
export function fetchScaleLabelTemplate(id) {
  return tenantRequest("GET", `scale-label-templates/${encodeURIComponent(String(id))}`);
}

/** @param {Record<string, unknown>} body */
export function createScaleLabelTemplate(body) {
  return tenantRequest("POST", "scale-label-templates", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 */
export function updateScaleLabelTemplate(id, body) {
  return tenantRequest("PUT", `scale-label-templates/${encodeURIComponent(String(id))}`, body);
}

/** @param {number | string} id */
export function deleteScaleLabelTemplate(id) {
  return tenantRequest("DELETE", `scale-label-templates/${encodeURIComponent(String(id))}`);
}

/** Items sold at the scale, for the packing station. @param {string} search */
export function fetchScaleLabelItems(search = "") {
  return tenantRequest("GET", `scale-labels/items${search ? `?search=${encodeURIComponent(search)}` : ""}`);
}

/**
 * One label as a PDF: a saved template (id) or an unsaved one (template), sample line when none.
 *
 * @param {{ scale_label_template_id?: number; template?: Record<string, unknown>; lines?: unknown[] }} body
 */
export async function previewScaleLabel(body) {
  return (await postForBlob("scale-labels/preview", body)).blob;
}

/**
 * @param {number} templateId
 * @param {Array<{ item_id: string; quantity?: string | number; total?: string | number; copies?: number; packed_date?: string }>} lines
 */
export async function printScaleLabels(templateId, lines) {
  return (await postForBlob("scale-labels/print", { scale_label_template_id: templateId, lines })).blob;
}
