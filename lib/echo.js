/**
 * Laravel Echo + Reverb client for tenant realtime notifications.
 *
 * What: Creates an Echo instance that authorizes private channels with Bearer Sanctum.
 * Used for: NotificationRealtimeProvider in the main app shell.
 * Solves: Instant inbox updates without relying on Phase 1 polling alone.
 */

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { getTenantApiUrl } from "@/lib/config";
import { resolveHostMode } from "@/lib/runtime-mode";
import { getSessionToken } from "@/lib/session";

/** @type {import("laravel-echo").default | null} */
let echoSingleton = null;

function reverbConfig() {
  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY || "";
  const host = process.env.NEXT_PUBLIC_REVERB_HOST || "localhost";
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080);
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || "http";
  const forceTLS = scheme === "https";

  return { key, host, port, scheme, forceTLS };
}

/**
 * @returns {boolean}
 */
export function isReverbConfigured() {
  const { key } = reverbConfig();
  return typeof key === "string" && key.trim() !== "";
}

/**
 * @returns {import("laravel-echo").default | null}
 */
export function getEcho() {
  if (typeof window === "undefined") return null;
  if (!isReverbConfigured()) return null;
  if (echoSingleton) return echoSingleton;

  const { key, host, port, forceTLS } = reverbConfig();

  // Echo expects Pusher on window when using the reverb/pusher broadcaster.
  window.Pusher = Pusher;

  echoSingleton = new Echo({
    broadcaster: "reverb",
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS,
    // Local http must not try wss:// — pusher-js otherwise upgrades and fails on :8080.
    encrypted: forceTLS,
    disableStats: true,
    enabledTransports: forceTLS ? ["wss"] : ["ws"],
    authEndpoint: (() => {
      const { tenantSlug } = resolveHostMode(window.location.hostname);
      if (!tenantSlug) return "/broadcasting/auth";
      return getTenantApiUrl(tenantSlug, "broadcasting/auth");
    })(),
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        const { tenantSlug } = resolveHostMode(window.location.hostname);
        const token = getSessionToken("tenant");
        if (!tenantSlug || !token) {
          callback(new Error("Not authenticated for tenant broadcasting"), null);
          return;
        }

        const url = getTenantApiUrl(tenantSlug, "broadcasting/auth");
        fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
          credentials: "include",
        })
          .then(async (response) => {
            if (!response.ok) {
              const text = await response.text().catch(() => "");
              throw new Error(text || `Broadcast auth failed (${response.status})`);
            }
            return response.json();
          })
          .then((data) => callback(null, data))
          .catch((error) => callback(error, null));
      },
    }),
  });

  return echoSingleton;
}

/**
 * Disconnect and drop the singleton (logout / unmount).
 */
export function disconnectEcho() {
  if (echoSingleton) {
    try {
      echoSingleton.disconnect();
    } catch {
      // ignore disconnect errors
    }
    echoSingleton = null;
  }
}
