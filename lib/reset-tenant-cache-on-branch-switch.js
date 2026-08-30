import { BRANCH_CONTEXT_QUERY_KEY } from "@/lib/active-branch";
import { AUTH_ME_QUERY_KEY } from "@/lib/auth-me";

/** Shared prefix for tenant React Query keys. Not scoped by branch id. */
export const TENANT_QUERY_KEY_PREFIX = /** @type {const} */ (["tenant"]);

const HOST_CONFIG_QUERY_PREFIXES = [
  ["tenant", "company-profile"],
  ["tenant", "company-settings"],
  ["tenant", "countries"],
  ["tenant", "modules"],
];

/**
 * Drop branch-scoped `["tenant", …]` cache after a branch switch, then seed the
 * switch response so the header/RBAC do not flash a loading state.
 *
 * Keys do not include branch id; the API is scoped via `X-Branch-Id`. Removing
 * (not invalidating) prevents inactive pages from the previous branch from
 * flashing on navigate-back.
 *
 * Host config (company profile, settings, modules) is tenant-wide and restored.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {{ branchContext: unknown, permissions?: unknown }} args
 */
export function resetTenantQueryCacheOnBranchSwitch(queryClient, { branchContext, permissions }) {
  const previousMe = queryClient.getQueryData(AUTH_ME_QUERY_KEY);
  /** @type {Array<[readonly unknown[], unknown]>} */
  const hostConfig = [];
  for (const prefix of HOST_CONFIG_QUERY_PREFIXES) {
    hostConfig.push(...queryClient.getQueriesData({ queryKey: prefix }));
  }

  queryClient.removeQueries({ queryKey: TENANT_QUERY_KEY_PREFIX });

  for (const [key, data] of hostConfig) {
    queryClient.setQueryData(key, data);
  }
  queryClient.setQueryData(BRANCH_CONTEXT_QUERY_KEY, branchContext);
  if (previousMe != null && typeof previousMe === "object") {
    queryClient.setQueryData(AUTH_ME_QUERY_KEY, {
      .../** @type {Record<string, unknown>} */ (previousMe),
      ...(permissions != null ? { permissions } : {}),
    });
  } else if (permissions != null) {
    queryClient.setQueryData(AUTH_ME_QUERY_KEY, { permissions });
  }
}
