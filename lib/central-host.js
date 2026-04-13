import { resolveHostMode } from "@/lib/runtime-mode";

/** Backward-compatible helper used by UI login screen. */
export function isCentralHostname(hostname) {
  return resolveHostMode(hostname).isCentral;
}
