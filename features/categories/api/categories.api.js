import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchCategories(params = {}) {
  return fetchPaginatedResource("categories", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchCategoryNames() {
  return fetchResourceNames("categories");
}

/**
 * Leaf categories only (assignable on items).
 *
 * @param {{ refresh?: boolean }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function fetchLeafCategories({ refresh = false } = {}) {
  const qs = refresh ? "?leaves_only=1&refresh=1" : "?leaves_only=1";
  const data = await tenantRequest("GET", `categories${qs}`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCategory(id) {
  return tenantRequest("GET", `categories/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCategory(body) {
  return tenantRequest("POST", "categories", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCategory(id, body) {
  return tenantRequest("PUT", `categories/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCategory(id) {
  return tenantRequest("DELETE", `categories/${id}`);
}
