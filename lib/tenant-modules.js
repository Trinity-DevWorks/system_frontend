/**
 * Tenant module entitlements (product packs).
 * Aligns with backend config/modules.php codes.
 */

import { tenantRequest } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function tenantModulesQueryKey(hostname) {
  return ["tenant-modules", hostname];
}

/** Always available; never gated away. */
export const CORE_MODULE = "core";

/* Path -> module mapping lives with the features that declare it, in
   `features/registry.js`; see `moduleForPath` there. */

/**
 * @param {unknown} payload From GET tenant/assigned-modules (already unwrapped).
 * @returns {string[]}
 */
export function normalizeAssignedModules(payload) {
  const raw = Array.isArray(payload?.modules)
    ? payload.modules
    : Array.isArray(payload)
      ? payload
      : [];

  const codes = raw
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter(Boolean);

  if (!codes.includes(CORE_MODULE)) {
    codes.push(CORE_MODULE);
  }

  return codes;
}

/**
 * @param {Iterable<string> | null | undefined} modules
 * @param {string} code
 */
export function tenantHasModule(modules, code) {
  if (code === CORE_MODULE) {
    return true;
  }
  if (!modules) {
    return true;
  }
  const set =
    modules instanceof Set ? modules : new Set(modules);
  return set.has(code);
}

/**
 * Fetch + cache assigned modules for the current tenant host.
 */
export function useTenantModules() {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  const query = useQuery({
    queryKey: tenantModulesQueryKey(hostname),
    queryFn: async () =>
      tenantRequest("GET", "tenant/assigned-modules"),
    enabled: Boolean(hostname),
    // Entitlements rarely change; invalidate when central assigns modules.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const modules = useMemo(
    () =>
      query.data != null
        ? normalizeAssignedModules(query.data)
        : null,
    [query.data],
  );

  const moduleSet = useMemo(
    () => (modules ? new Set(modules) : null),
    [modules],
  );

  return {
    modules,
    moduleSet,
    isLoading: query.isPending && query.data == null,
    isError: query.isError,
    refetch: query.refetch,
    hasModule: (code) => tenantHasModule(moduleSet, code),
  };
}
