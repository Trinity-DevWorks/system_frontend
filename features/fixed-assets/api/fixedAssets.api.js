import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";
import { downloadPdf } from "@/shared/api/downloadPdf";
import { documentPdfFilename } from "@/shared/utils/documentPdf";

/** @param {Record<string, string | number | boolean | undefined | null>} [params] */
export function fetchFixedAssets(params = {}) {
  return fetchPaginatedResource("fixed-assets", params);
}

/** @param {string} id */
export function fetchFixedAsset(id) {
  return tenantRequest("GET", `fixed-assets/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createFixedAsset(body) {
  return tenantRequest("POST", "fixed-assets", body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function updateFixedAsset(id, body) {
  return tenantRequest("PUT", `fixed-assets/${id}`, body);
}

/** @param {string} id */
export function deleteFixedAsset(id) {
  return tenantRequest("DELETE", `fixed-assets/${id}`);
}

/** @param {string} id */
export function activateFixedAsset(id) {
  return tenantRequest("POST", `fixed-assets/${id}/activate`);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function changeFixedAssetEstimate(id, body) {
  return tenantRequest("POST", `fixed-assets/${id}/estimate`, body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function disposeFixedAsset(id, body) {
  return tenantRequest("POST", `fixed-assets/${id}/dispose`, body);
}

/** @param {string} id */
export function reverseFixedAssetDisposal(id) {
  return tenantRequest("POST", `fixed-assets/${id}/reverse-disposal`);
}

/** @param {string} id @param {string} [locale] */
export async function downloadFixedAssetPdf(id, number, options = {}) {
  await downloadPdf(`fixed-assets/${id}/pdf`, documentPdfFilename(number, "fixed-asset"), options);
}

/** @param {Record<string, string | number | boolean | undefined | null>} [params] */
export function fetchAssetCategories(params = {}) {
  return fetchPaginatedResource("fixed-asset-categories", params);
}

/** @param {number | string} id */
export function fetchAssetCategory(id) {
  return tenantRequest("GET", `fixed-asset-categories/${id}`);
}

export function fetchAssetCategoryDefaults() {
  return tenantRequest("GET", "fixed-asset-categories/defaults");
}

/** @param {Record<string, unknown>} body */
export function createAssetCategory(body) {
  return tenantRequest("POST", "fixed-asset-categories", body);
}

/** @param {number | string} id @param {Record<string, unknown>} body */
export function updateAssetCategory(id, body) {
  return tenantRequest("PUT", `fixed-asset-categories/${id}`, body);
}

/** @param {number | string} id */
export function deleteAssetCategory(id) {
  return tenantRequest("DELETE", `fixed-asset-categories/${id}`);
}

export function fetchDepreciationRuns() {
  return tenantRequest("GET", "accounting/depreciation-runs");
}

/** @param {string} month @param {number | null} [branchId] */
export function previewDepreciation(month, branchId) {
  return tenantRequest("GET", "accounting/depreciation-runs/preview", null, {
    params: { month, branch_id: branchId ?? undefined },
  });
}

/** Posts the month for one branch, or for every branch the user may access when branchId is empty. @param {string} month @param {number | null} [branchId] */
export function postDepreciation(month, branchId) {
  return tenantRequest("POST", "accounting/depreciation-runs", { month, branch_id: branchId ?? undefined });
}

/** Undoes the month for one branch. @param {string} month @param {number} branchId */
export function undoDepreciation(month, branchId) {
  return tenantRequest("DELETE", `accounting/depreciation-runs/${month}`, null, { params: { branch_id: branchId } });
}
