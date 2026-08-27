import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   warehouse_id?: number;
 *   item_id?: string;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchBundleExplosions(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest(
    "GET",
    qs ? `stock/bundle-explosions?${qs}` : "stock/bundle-explosions",
  );
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createBundleExplosion(body) {
  return tenantRequest("POST", "stock/bundle-explosions", body);
}

/**
 * @param {string} documentId
 */
export function fetchBundleExplosion(documentId) {
  return tenantRequest("GET", `stock/bundle-explosions/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {Record<string, unknown>} body
 */
export function updateBundleExplosion(documentId, body) {
  return tenantRequest("PUT", `stock/bundle-explosions/${documentId}`, body);
}

/**
 * @param {string} documentId
 */
export function deleteBundleExplosion(documentId) {
  return tenantRequest("DELETE", `stock/bundle-explosions/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export async function syncBundleExplosionLines(documentId, body) {
  const data = await tenantRequest("PUT", `stock/bundle-explosions/${documentId}/lines/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} documentId
 */
export function postBundleExplosion(documentId) {
  return tenantRequest("POST", `stock/bundle-explosions/${documentId}/post`);
}
