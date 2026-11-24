import { DEFAULT_PLATFORM_BRANDING, normalizePlatformBranding } from "@/lib/platform-branding-shape";
import { getServerCentralApiBase } from "./centralApiBase";

const BRANDING_REVALIDATE_SECONDS = 60;
const BRANDING_TIMEOUT_MS = 3000;

/**
 * Public platform branding for layouts and metadata. Never throws: a failed fetch falls back to defaults.
 *
 * @returns {Promise<import("@/lib/platform-branding-shape").PlatformBranding>}
 */
export async function fetchPlatformBranding() {
  try {
    const res = await fetch(`${getServerCentralApiBase()}/branding`, {
      headers: { Accept: "application/json" },
      next: { revalidate: BRANDING_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(BRANDING_TIMEOUT_MS),
    });
    if (!res.ok) {
      return DEFAULT_PLATFORM_BRANDING;
    }
    const json = await res.json();
    return normalizePlatformBranding(json?.data);
  } catch {
    return DEFAULT_PLATFORM_BRANDING;
  }
}
