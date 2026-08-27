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
export async function fetchProductions(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/productions?${qs}` : "stock/productions");
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createProduction(body) {
  return tenantRequest("POST", "stock/productions", body);
}

/**
 * @param {string} documentId
 */
export function fetchProduction(documentId) {
  return tenantRequest("GET", `stock/productions/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {Record<string, unknown>} body
 */
export function updateProduction(documentId, body) {
  return tenantRequest("PUT", `stock/productions/${documentId}`, body);
}

/**
 * @param {string} documentId
 */
export function deleteProduction(documentId) {
  return tenantRequest("DELETE", `stock/productions/${documentId}`);
}

/**
 * @param {string} documentId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export async function syncProductionLines(documentId, body) {
  const data = await tenantRequest("PUT", `stock/productions/${documentId}/lines/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} documentId
 */
export function postProduction(documentId) {
  return tenantRequest("POST", `stock/productions/${documentId}/post`);
}
