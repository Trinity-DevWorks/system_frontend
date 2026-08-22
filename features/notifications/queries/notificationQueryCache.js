/**
 * Inbox React Query cache (bell, full page, unread badge).
 * Preferences live under the same prefix and are left untouched.
 */

import { NOTIFICATIONS_QUERY_KEY } from "./notificationsQueryKeys";

/**
 * @param {readonly unknown[]} queryKey
 */
export function isNotificationInboxKey(queryKey) {
  if (!Array.isArray(queryKey) || queryKey.length < 2) return false;
  if (queryKey[0] !== "tenant" || queryKey[1] !== "notifications") return false;
  return queryKey[2] !== "preferences";
}

/**
 * @param {readonly unknown[]} queryKey
 */
function isUnreadListKey(queryKey) {
  return isNotificationInboxKey(queryKey) && queryKey[3] === "unread";
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @returns {Array<[readonly unknown[], unknown]>}
 */
export function snapshotNotificationInboxCache(queryClient) {
  return queryClient
    .getQueriesData({ queryKey: NOTIFICATIONS_QUERY_KEY })
    .filter(([key]) => isNotificationInboxKey(key));
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {Array<[readonly unknown[], unknown]> | undefined} snapshot
 */
export function restoreNotificationInboxCache(queryClient, snapshot) {
  if (!Array.isArray(snapshot)) return;
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 */
export function invalidateNotificationInboxQueries(queryClient) {
  return queryClient.invalidateQueries({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    predicate: (query) => isNotificationInboxKey(query.queryKey),
  });
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 */
export function cancelNotificationInboxQueries(queryClient) {
  return queryClient.cancelQueries({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    predicate: (query) => isNotificationInboxKey(query.queryKey),
  });
}

/**
 * @param {unknown} item
 * @param {string} id
 */
function itemIdEquals(item, id) {
  return item != null && typeof item === "object" && String(/** @type {{ id?: unknown }} */ (item).id) === id;
}

/**
 * @param {unknown} envelope
 * @param {(items: unknown[]) => unknown[]} mapItems
 * @param {{ unreadCount?: number, paginationTotal?: number }} [counts]
 */
function mapNotificationEnvelope(envelope, mapItems, counts = {}) {
  if (!envelope || typeof envelope !== "object" || !Array.isArray(/** @type {{ items?: unknown }} */ (envelope).items)) {
    return envelope;
  }
  const current = /** @type {{ items: unknown[], unread_count?: number, pagination?: Record<string, unknown> }} */ (
    envelope
  );
  const next = { ...current, items: mapItems(current.items) };
  if (counts.unreadCount != null) next.unread_count = counts.unreadCount;
  else if (typeof current.unread_count === "number") {
    next.unread_count = Math.max(0, current.unread_count - 1);
  }
  if (counts.paginationTotal != null && current.pagination && typeof current.pagination === "object") {
    next.pagination = { ...current.pagination, total: counts.paginationTotal };
  }
  return next;
}

/**
 * Mark one inbox row read across bell, page, and badge caches.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} id
 */
export function markNotificationReadInCache(queryClient, id) {
  const sid = String(id);
  let foundUnread = false;
  let seenItem = false;
  for (const [, data] of queryClient.getQueriesData({ queryKey: NOTIFICATIONS_QUERY_KEY })) {
    if (!data || typeof data !== "object" || !Array.isArray(/** @type {{ items?: unknown }} */ (data).items)) {
      continue;
    }
    const items = /** @type {unknown[]} */ (/** @type {{ items: unknown[] }} */ (data).items);
    const target = items.find((item) => itemIdEquals(item, sid));
    if (!target) continue;
    seenItem = true;
    if (!/** @type {{ read?: unknown }} */ (target).read) {
      foundUnread = true;
      break;
    }
  }
  if (seenItem && !foundUnread) return;

  for (const [key, data] of queryClient.getQueriesData({ queryKey: NOTIFICATIONS_QUERY_KEY })) {
    if (!isNotificationInboxKey(key)) continue;

    if (key[2] === "unread-count") {
      queryClient.setQueryData(key, Math.max(0, (Number(data) || 0) - 1));
      continue;
    }

    if (!data || typeof data !== "object" || !Array.isArray(/** @type {{ items?: unknown }} */ (data).items)) {
      continue;
    }

    const items = /** @type {unknown[]} */ (/** @type {{ items: unknown[] }} */ (data).items);
    const target = items.find((item) => itemIdEquals(item, sid));
    if (!target || /** @type {{ read?: unknown }} */ (target).read) continue;

    if (isUnreadListKey(key)) {
      const paginationTotal = Number(/** @type {{ pagination?: { total?: unknown } }} */ (data).pagination?.total);
      queryClient.setQueryData(
        key,
        mapNotificationEnvelope(
          data,
          (rows) => rows.filter((item) => !itemIdEquals(item, sid)),
          {
            paginationTotal: Number.isFinite(paginationTotal) ? Math.max(0, paginationTotal - 1) : undefined,
          },
        ),
      );
      continue;
    }

    queryClient.setQueryData(
      key,
      mapNotificationEnvelope(data, (rows) =>
        rows.map((item) =>
          itemIdEquals(item, sid)
            ? { .../** @type {Record<string, unknown>} */ (item), read: true }
            : item,
        ),
      ),
    );
  }
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 */
export function markAllNotificationsReadInCache(queryClient) {
  for (const [key, data] of queryClient.getQueriesData({ queryKey: NOTIFICATIONS_QUERY_KEY })) {
    if (!isNotificationInboxKey(key)) continue;

    if (key[2] === "unread-count") {
      queryClient.setQueryData(key, 0);
      continue;
    }

    if (!data || typeof data !== "object" || !Array.isArray(/** @type {{ items?: unknown }} */ (data).items)) {
      continue;
    }

    if (isUnreadListKey(key)) {
      queryClient.setQueryData(
        key,
        mapNotificationEnvelope(data, () => [], { unreadCount: 0, paginationTotal: 0 }),
      );
      continue;
    }

    queryClient.setQueryData(
      key,
      mapNotificationEnvelope(
        data,
        (rows) =>
          rows.map((item) =>
            item && typeof item === "object" && !/** @type {{ read?: unknown }} */ (item).read
              ? { .../** @type {Record<string, unknown>} */ (item), read: true }
              : item,
          ),
        { unreadCount: 0 },
      ),
    );
  }
}
