/**
 * Tenant module entitlements (product packs).
 * Aligns with backend config/modules.php codes.
 */

import tenantApiService from "@/API/TenantApiService";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function tenantModulesQueryKey(hostname) {
  return ["tenant-modules", hostname];
}

/** Always available; never gated away. */
export const CORE_MODULE = "core";

/**
 * Longest-prefix path → module code.
 * More specific paths first is not required; we pick the longest matching prefix.
 * @type {ReadonlyArray<{ prefix: string, module: string }>}
 */
export const PATH_MODULE_RULES = [
  { prefix: "/main/overview", module: CORE_MODULE },
  { prefix: "/main/company-profile", module: CORE_MODULE },
  { prefix: "/main/tenant-settings", module: CORE_MODULE },
  { prefix: "/main/branches", module: CORE_MODULE },
  { prefix: "/main/users", module: CORE_MODULE },
  { prefix: "/main/roles", module: CORE_MODULE },
  { prefix: "/main/permissions", module: CORE_MODULE },

  { prefix: "/main/brands", module: "master_data" },
  { prefix: "/main/categories", module: "master_data" },
  { prefix: "/main/vat-groups", module: "master_data" },
  { prefix: "/main/currencies", module: "master_data" },
  { prefix: "/main/payment-methods", module: "master_data" },
  { prefix: "/main/payment-terms", module: "master_data" },

  { prefix: "/main/unit-groups", module: "inventory" },
  { prefix: "/main/unit-of-measurements", module: "inventory" },
  { prefix: "/main/warehouses", module: "inventory" },
  { prefix: "/main/items", module: "inventory" },
  { prefix: "/main/stock", module: "inventory" },

  { prefix: "/main/salesmen", module: "sales" },
  { prefix: "/main/customer-groups", module: "sales" },
  { prefix: "/main/customers", module: "sales" },

  { prefix: "/main/supplier-groups", module: "purchasing" },
  { prefix: "/main/suppliers", module: "purchasing" },
];

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
 * @param {string} pathname Locale-stripped path (e.g. /main/items)
 * @returns {string | null} Module code, or null if ungated
 */
export function moduleForPath(pathname) {
  if (!pathname || typeof pathname !== "string") {
    return null;
  }

  let best = null;
  let bestLen = -1;

  for (const rule of PATH_MODULE_RULES) {
    if (
      pathname === rule.prefix ||
      pathname.startsWith(`${rule.prefix}/`)
    ) {
      if (rule.prefix.length > bestLen) {
        best = rule.module;
        bestLen = rule.prefix.length;
      }
    }
  }

  return best;
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
      tenantApiService("GET", "tenant/assigned-modules"),
    enabled: Boolean(hostname),
    staleTime: 5 * 60 * 1000,
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
