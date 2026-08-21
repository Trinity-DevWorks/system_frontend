import { mapListCacheRows } from "@/lib/tables/paginatedList";

/**
 * True for unpaginated `?section=names` arrays and server-paginated `{ rows }` pages.
 * Skips detail records (`[..., id]`) and nested caches (`[..., id, "attachments"]`).
 *
 * @param {readonly unknown[]} queryKey
 * @param {readonly unknown[]} listKey
 * @param {unknown} data
 */
export function isTenantListCacheEntry(queryKey, listKey, data) {
  if (!Array.isArray(queryKey) || queryKey.length < listKey.length) return false;
  for (let i = 0; i < listKey.length; i += 1) {
    if (queryKey[i] !== listKey[i]) return false;
  }
  if (queryKey.length === listKey.length) {
    return Array.isArray(data);
  }
  if (queryKey.length !== listKey.length + 1) return false;
  const suffix = queryKey[queryKey.length - 1];
  if (suffix == null || typeof suffix !== "object" || Array.isArray(suffix)) return false;
  return Boolean(data && typeof data === "object" && Array.isArray(/** @type {{ rows?: unknown }} */ (data).rows));
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {readonly unknown[]} listKey
 * @returns {Array<[readonly unknown[], unknown]>}
 */
export function snapshotTenantListCache(queryClient, listKey) {
  return queryClient
    .getQueriesData({ queryKey: listKey })
    .filter(([key, data]) => isTenantListCacheEntry(key, listKey, data));
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {Array<[readonly unknown[], unknown]> | undefined} snapshot
 */
export function restoreTenantListCache(queryClient, snapshot) {
  if (!Array.isArray(snapshot)) return;
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

/**
 * Map names arrays and paginated `{ rows }` pages. Never creates a cache entry.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {readonly unknown[]} listKey
 * @param {(rows: unknown[]) => unknown[]} mapRows
 */
export function patchTenantListCache(queryClient, listKey, mapRows) {
  for (const [key, data] of queryClient.getQueriesData({ queryKey: listKey })) {
    if (!isTenantListCacheEntry(key, listKey, data)) continue;
    queryClient.setQueryData(key, mapListCacheRows(data, mapRows));
  }
}

/**
 * @param {unknown} row
 */
function rowIdString(row) {
  if (row == null || typeof row !== "object") return "";
  return String(/** @type {{ id?: unknown }} */ (row).id ?? "");
}

/**
 * Drop matching rows from a names array or paginated `{ rows, total }` page.
 *
 * @param {unknown} old
 * @param {Set<string>} idSet
 */
export function removeIdsFromListCacheData(old, idSet) {
  if (Array.isArray(old)) {
    return old.filter((row) => !idSet.has(rowIdString(row)));
  }
  if (old && typeof old === "object" && Array.isArray(/** @type {{ rows?: unknown }} */ (old).rows)) {
    const current = /** @type {{ rows: unknown[], total?: number, from?: number | null, to?: number | null }} */ (
      old
    );
    const rows = current.rows.filter((row) => !idSet.has(rowIdString(row)));
    const removed = current.rows.length - rows.length;
    if (removed === 0) return old;
    const next = { ...current, rows };
    if (typeof current.total === "number") next.total = Math.max(0, current.total - removed);
    if (rows.length === 0) {
      next.from = null;
      next.to = null;
    } else if (typeof current.to === "number") {
      next.to = Math.max(typeof current.from === "number" ? current.from : 0, current.to - removed);
    }
    return next;
  }
  return old;
}

/**
 * Remove rows by id from every names/paginated list cache under `listKey`.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {readonly unknown[]} listKey
 * @param {readonly unknown[]} ids
 */
export function removeIdsFromTenantListCache(queryClient, listKey, ids) {
  const idSet = new Set(ids.map((id) => String(id)));
  if (idSet.size === 0) return;
  for (const [key, data] of queryClient.getQueriesData({ queryKey: listKey })) {
    if (!isTenantListCacheEntry(key, listKey, data)) continue;
    queryClient.setQueryData(key, removeIdsFromListCacheData(data, idSet));
  }
}
