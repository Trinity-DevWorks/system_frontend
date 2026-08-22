"use client";

/**
 * Subscribe to the authenticated user's private notification channel.
 *
 * What: On Laravel notification broadcast, invalidate React Query notification keys.
 * Used for: Main app shell (tenant workspace only).
 * Solves: Instant bell/inbox updates; polling remains as a fallback.
 */

import { useAuthMe } from "@/lib/auth-me";
import { disconnectEcho, getEcho, isReverbConfigured } from "@/lib/echo";
import { resolveHostMode } from "@/lib/runtime-mode";
import { getSessionToken } from "@/lib/session";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { NOTIFICATIONS_QUERY_KEY } from "@/features/notifications";

/**
 * @param {{ children?: import("react").ReactNode }} props
 */
export default function NotificationRealtimeProvider({ children = null }) {
  const queryClient = useQueryClient();
  const { me, isReady } = useAuthMe();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!isReverbConfigured()) return undefined;

    const { isCentral, tenantSlug } = resolveHostMode(window.location.hostname);
    if (isCentral || !tenantSlug) return undefined;
    if (!getSessionToken("tenant")) return undefined;
    if (!isReady || !me?.id) return undefined;

    const echo = getEcho();
    if (!echo) return undefined;

    const channelName = `App.Models.User.${me.id}`;
    const channel = echo.private(channelName);
    const retryTimers = new Set();

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      // Database and broadcast channels are queued independently. Recheck once
      // in case the realtime ping wins the small race with inbox persistence.
      const timer = window.setTimeout(() => {
        retryTimers.delete(timer);
        queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      }, 750);
      retryTimers.add(timer);
    };

    channel.notification(invalidate);

    return () => {
      try {
        echo.leave(channelName);
      } catch {
        // ignore
      }
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isReady, me?.id, queryClient]);

  useEffect(() => {
    return () => {
      disconnectEcho();
    };
  }, []);

  return children;
}
