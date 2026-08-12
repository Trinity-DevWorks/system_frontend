/**
 * Drop all React Query cache when the authenticated principal changes.
 *
 * Tenant list keys are not scoped by user id, so soft logout → login would
 * otherwise keep showing the previous user's cached rows until a hard refresh.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 */
export function clearQueryCacheOnAuthChange(queryClient) {
  queryClient.clear();
}
