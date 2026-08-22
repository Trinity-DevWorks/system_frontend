/**
 * Notification cache keys.
 *
 * The inbox (bell, full page, unread badge) and the preference screen share the
 * `["tenant", "notifications"]` prefix, so invalidating the base key touches both.
 * `notificationQueryCache.js` holds the selective helpers that avoid that.
 */

export const NOTIFICATIONS_QUERY_KEY = /** @type {const} */ (["tenant", "notifications"]);

export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = /** @type {const} */ ([
  "tenant",
  "notifications",
  "unread-count",
]);
