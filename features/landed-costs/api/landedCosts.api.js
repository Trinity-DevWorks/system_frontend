import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";
import { downloadPdf, printPdf } from "@/shared/api/downloadPdf";
import { documentPdfFilename } from "@/shared/utils/documentPdf";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchLandedCosts(params = {}) {
  return fetchPaginatedResource("landed-costs", params);
}

/** @param {string} id */
export function fetchLandedCost(id) {
  return tenantRequest("GET", `landed-costs/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createLandedCost(body) {
  return tenantRequest("POST", "landed-costs", body);
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 */
export function updateLandedCost(id, body) {
  return tenantRequest("PUT", `landed-costs/${id}`, body);
}

/** @param {string} id */
export function deleteLandedCost(id) {
  return tenantRequest("DELETE", `landed-costs/${id}`);
}

/** @param {string} id */
export function postLandedCost(id) {
  return tenantRequest("POST", `landed-costs/${id}/post`);
}

/** @param {string} id */
export function reverseLandedCost(id) {
  return tenantRequest("POST", `landed-costs/${id}/reverse`);
}

/**
 * Unsaved allocation: lines with added cost and landed unit cost.
 * @param {Record<string, unknown>} body
 * @param {string | null} [landedCostId]
 */
export function previewLandedCost(body, landedCostId = null) {
  const qs = landedCostId ? `?landed_cost_id=${encodeURIComponent(landedCostId)}` : "";
  return tenantRequest("POST", `landed-costs/preview${qs}`, body);
}

/**
 * @param {"receipts" | "charges"} type
 * @param {{ search?: string; landedCostId?: string | null }} [opts]
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function fetchLandedCostSources(type, opts = {}) {
  const params = new URLSearchParams({ type });
  if (opts.search) params.set("search", opts.search);
  if (opts.landedCostId) params.set("landed_cost_id", opts.landedCostId);
  const data = await tenantRequest("GET", `landed-costs/sources?${params.toString()}`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} id
 * @param {string | undefined} documentNumber
 * @param {{ locale?: string; mode?: string }} [options]
 */
export async function downloadLandedCostPdf(id, documentNumber, options = {}) {
  if (options.mode === "print") {
    await printPdf(`landed-costs/${id}/pdf`, options);
    return;
  }
  await downloadPdf(`landed-costs/${id}/pdf`, documentPdfFilename(documentNumber, "landed-cost"), options);
}
