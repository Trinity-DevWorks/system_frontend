import { mapListCacheRows } from "@/lib/tables/paginatedList";

/**
 * True for names lookups (`["tenant", "brands"]`) and paginated pages
 * (`["tenant", "brands", { page, per_page }]`). Skips detail ids and nested keys.
 * Key-shape only — safe for cancel/invalidate before data exists.
 *
 * @param {readonly unknown[]} queryKey
 * @param {readonly unknown[]} listKey
 */
export function isTenantListQueryKey(queryKey, listKey) {
  if (!Array.isArray(queryKey) || queryKey.length < listKey.length) return false;
  for (let i = 0; i < listKey.length; i += 1) {
    if (queryKey[i] !== listKey[i]) return false;
  }
  if (queryKey.length === listKey.length) return true;
  if (queryKey.length !== listKey.length + 1) return false;
  const suffix = queryKey[queryKey.length - 1];
  return suffix != null && typeof suffix === "object" && !Array.isArray(suffix);
}

/**
 * True for unpaginated `?section=names` arrays and server-paginated `{ rows }` pages.
 * Skips detail records (`[..., id]`) and nested caches (`[..., id, "attachments"]`).
 *
 * @param {readonly unknown[]} queryKey
 * @param {readonly unknown[]} listKey
 * @param {unknown} data
 */
export function isTenantListCacheEntry(queryKey, listKey, data) {
  if (!isTenantListQueryKey(queryKey, listKey)) return false;
  if (queryKey.length === listKey.length) {
    return Array.isArray(data);
  }
  return Boolean(data && typeof data === "object" && Array.isArray(/** @type {{ rows?: unknown }} */ (data).rows));
}

/**
 * Invalidate names + paginated pages only. Does not mark detail or nested queries stale.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {readonly unknown[]} listKey
 */
export function invalidateTenantListQueries(queryClient, listKey) {
  return queryClient.invalidateQueries({
    queryKey: listKey,
    predicate: (query) => isTenantListQueryKey(query.queryKey, listKey),
  });
}

/**
 * Cancel in-flight names + paginated fetches only.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {readonly unknown[]} listKey
 */
export function cancelTenantListQueries(queryClient, listKey) {
  return queryClient.cancelQueries({
    queryKey: listKey,
    predicate: (query) => isTenantListQueryKey(query.queryKey, listKey),
  });
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
 * Names lookup (`[...listKey]`) or first paginated page (`page === 1`).
 *
 * @param {readonly unknown[]} queryKey
 * @param {readonly unknown[]} listKey
 */
export function isTenantListCreateTargetKey(queryKey, listKey) {
  if (!isTenantListQueryKey(queryKey, listKey)) return false;
  if (queryKey.length === listKey.length) return true;
  const suffix = queryKey[queryKey.length - 1];
  if (suffix == null || typeof suffix !== "object" || Array.isArray(suffix)) return false;
  const page = /** @type {{ page?: unknown }} */ (suffix).page;
  return page == null || Number(page) === 1;
}

/**
 * @param {unknown} old
 * @param {(rows: unknown[]) => unknown[]} mapRows
 */
function mapListCacheRowsAdjustingTotal(old, mapRows) {
  if (Array.isArray(old)) return mapRows(old);
  if (old && typeof old === "object" && Array.isArray(/** @type {{ rows?: unknown }} */ (old).rows)) {
    const current = /** @type {{ rows: unknown[], total?: number, from?: number | null, to?: number | null }} */ (
      old
    );
    const rows = mapRows(current.rows);
    const added = rows.length - current.rows.length;
    const next = { ...current, rows };
    if (added !== 0 && typeof current.total === "number") {
      next.total = Math.max(0, current.total + added);
    }
    if (added !== 0 && typeof current.to === "number") {
      next.to = current.to + added;
    }
    return next;
  }
  return old;
}

/**
 * Optimistic/reconcile create: patch the names list and page 1 only.
 * Later pages keep their rows; `onSettled` invalidation refetches them.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {readonly unknown[]} listKey
 * @param {(rows: unknown[]) => unknown[]} mapRows
 */
export function patchTenantListCacheForCreate(queryClient, listKey, mapRows) {
  for (const [key, data] of queryClient.getQueriesData({ queryKey: listKey })) {
    if (!isTenantListCacheEntry(key, listKey, data)) continue;
    if (!isTenantListCreateTargetKey(key, listKey)) continue;
    queryClient.setQueryData(key, mapListCacheRowsAdjustingTotal(data, mapRows));
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
