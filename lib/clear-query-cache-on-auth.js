import { clearMediaPreviewCache } from "@/shared/components/attachments/mediaPreviewCache";
import { clearLocalPreferenceUserId } from "@/lib/local-preference-scope";

/**
 * Drop React Query cache and attachment blob URLs when the authenticated principal changes.
 *
 * Tenant list keys are not scoped by user id, and media preview object URLs live
 * outside QueryClient, so soft logout → login would otherwise keep the previous
 * user's rows and file previews until a hard refresh.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 */
export function clearQueryCacheOnAuthChange(queryClient) {
  queryClient.clear();
  clearMediaPreviewCache();
  clearLocalPreferenceUserId();
}
