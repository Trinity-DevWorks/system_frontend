import { tenantRequest } from "@/lib/axios";
/**
 * Tenant notification inbox API client (Phase 1).
 *
 * What: Thin wrappers around /notifications endpoints for the header bell and preferences.
 * Used for: AppHeader NotificationBell + React Query hooks.
 * Solves: Centralizes inbox HTTP calls so UI components do not hard-code paths or envelope handling.
 */

/**
 * @param {{ page?: number, per_page?: number, unread?: boolean }} [params]
 * @returns {Promise<{ items: unknown[], unread_count: number, pagination: Record<string, unknown> }>}
 */
export async function fetchNotifications(params = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.per_page) search.set("per_page", String(params.per_page));
  if (params.unread) search.set("unread", "1");

  const qs = search.toString();
  const data = await tenantRequest(
    "GET",
    qs ? `notifications?${qs}` : "notifications",
  );

  if (Array.isArray(data)) {
    return { items: data, unread_count: 0, pagination: {} };
  }

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    unread_count: Number(data?.unread_count) || 0,
    pagination:
      data?.pagination && typeof data.pagination === "object"
        ? data.pagination
        : {},
  };
}

/**
 * @returns {Promise<number>}
 */
export async function fetchUnreadNotificationCount() {
  const data = await tenantRequest("GET", "notifications/unread-count");
  const count = data?.unread_count ?? data?.unreadCount ?? 0;
  return Number(count) || 0;
}

/**
 * @param {string} id
 * @returns {Promise<unknown>}
 */
export function markNotificationRead(id) {
  return tenantRequest("POST", `notifications/${id}/read`);
}

/**
 * @returns {Promise<unknown>}
 */
export function markAllNotificationsRead() {
  return tenantRequest("POST", "notifications/read-all");
}

/**
 * @returns {Promise<unknown>}
 */
export function clearReadNotifications() {
  return tenantRequest("DELETE", "notifications/read");
}

/**
 * @returns {Promise<unknown>}
 */
export function clearAllNotifications() {
  return tenantRequest("DELETE", "notifications");
}

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchNotificationPreferences() {
  const data = await tenantRequest("GET", "notifications/preferences");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {Array<{ type: string, channel: string, enabled: boolean }>} preferences
 * @returns {Promise<unknown[]>}
 */
export async function updateNotificationPreferences(preferences) {
  const data = await tenantRequest("PUT", "notifications/preferences", {
    preferences,
  });
  return Array.isArray(data) ? data : [];
}
