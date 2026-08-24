import { tenantRequest } from "@/lib/axios";

/**
 * @param {Record<string, string | number | boolean | undefined | null>} params
 * @returns {URLSearchParams}
 */
export function toListQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    if (value === false) continue;
    query.set(key, value === true ? "1" : String(value));
  }
  return query;
}

/**
 * @param {unknown} payload
 * @param {{ page?: number; per_page?: number }} [params]
 * @returns {{
 *   rows: unknown[];
 *   total: number;
 *   currentPage: number;
 *   perPage: number;
 *   from: number | null;
 *   to: number | null;
 * }}
 */
export function parsePaginatedList(payload, params = {}) {
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return {
    rows,
    total: Number(payload?.total ?? rows.length) || 0,
    currentPage: Number(payload?.current_page ?? params.page ?? 1) || 1,
    perPage: Number(payload?.per_page ?? params.per_page ?? 20) || 20,
    from: payload?.from != null ? Number(payload.from) : null,
    to: payload?.to != null ? Number(payload.to) : null,
  };
}

/**
 * @param {string} endpoint
 * @param {Record<string, string | number | boolean | undefined | null>} [params]
 */
export async function fetchPaginatedResource(endpoint, params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `${endpoint}?${qs}` : endpoint);
  return parsePaginatedList(payload, params);
}

/**
 * Unpaginated lookup list for selects / drawers.
 * @param {string} endpoint
 * @returns {Promise<unknown[]>}
 */
export async function fetchResourceNames(endpoint) {
  const data = await tenantRequest("GET", `${endpoint}?section=names`);
  return Array.isArray(data) ? data : [];
}

/**
 * Patch rows whether the cache holds a lookup array or a paginated `{ rows }` page.
 * @param {unknown} old
 * @param {(rows: unknown[]) => unknown[]} mapRows
 */
export function mapListCacheRows(old, mapRows) {
  if (Array.isArray(old)) return mapRows(old);
  if (old && typeof old === "object" && Array.isArray(/** @type {{ rows?: unknown }} */ (old).rows)) {
    const current = /** @type {{ rows: unknown[] }} */ (old);
    return { ...current, rows: mapRows(current.rows) };
  }
  return old;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, MAX_PAGE_SIZE];
