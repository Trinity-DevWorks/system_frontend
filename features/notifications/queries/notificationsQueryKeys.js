/**
 * Notification cache keys.
 *
 * Invalidate inbox keys with `invalidateNotificationInboxQueries` so the
 * preferences query (`[..., "preferences"]`) is not refetched.
 */

export const NOTIFICATIONS_QUERY_KEY = /** @type {const} */ (["tenant", "notifications"]);

export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = /** @type {const} */ ([
  "tenant",
  "notifications",
  "unread-count",
]);
