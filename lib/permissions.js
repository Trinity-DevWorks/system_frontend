/**
 * Client-side RBAC helpers.
 * Matrix comes from auth/login, auth/me, and branch-context (server remains source of truth).
 */

import { fetchAuthMe } from "@/services/branchContextApi";
import { getSessionToken } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export const PERMISSIONS_QUERY_KEY = /** @type {const} */ (["tenant", "auth", "permissions"]);

/** @typedef {"view" | "add" | "edit" | "delete" | "import" | "export"} PermissionAction */

const ACTION_FLAGS = /** @type {const} */ ({
  view: "can_view",
  add: "can_add",
  edit: "can_edit",
  delete: "can_delete",
  import: "can_import",
  export: "can_export",
});

/**
 * Longest-prefix path → rbac resource_key (config/rbac.php).
 * Overview has no rule (always allowed after module gate).
 * @type {ReadonlyArray<{ prefix: string, resource: string }>}
 */
export const PATH_PERMISSION_RULES = [
  { prefix: "/main/settings/company-settings", resource: "tenant_settings" },
  { prefix: "/main/settings/company-profile", resource: "company_profile" },
  { prefix: "/main/settings", resource: "company_profile" },
  { prefix: "/main/branches", resource: "branches" },
  { prefix: "/main/users", resource: "users" },
  { prefix: "/main/roles", resource: "roles" },
  { prefix: "/main/permissions", resource: "permissions" },
  { prefix: "/main/audit-log", resource: "audits" },
  { prefix: "/main/brands", resource: "brands" },
  { prefix: "/main/categories", resource: "categories" },
  { prefix: "/main/vat-groups", resource: "vat_groups" },
  { prefix: "/main/currencies", resource: "currencies" },
  { prefix: "/main/payment-methods", resource: "payment_methods" },
  { prefix: "/main/payment-terms", resource: "payment_terms" },
  { prefix: "/main/unit-groups", resource: "unit_groups" },
  { prefix: "/main/unit-of-measurements", resource: "unit_of_measurements" },
  { prefix: "/main/warehouses", resource: "warehouses" },
  { prefix: "/main/items", resource: "items" },
  { prefix: "/main/stock", resource: "stock" },
  { prefix: "/main/salesmen", resource: "salesmen" },
  { prefix: "/main/customer-groups", resource: "customer_groups" },
  { prefix: "/main/customers", resource: "customers" },
  { prefix: "/main/supplier-groups", resource: "supplier_groups" },
  { prefix: "/main/suppliers", resource: "suppliers" },
];

/**
 * @param {unknown} raw
 * @returns {Record<string, Record<string, boolean>>}
 */
export function normalizePermissionMatrix(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  /** @type {Record<string, Record<string, boolean>>} */
  const out = {};
  for (const [resource, flags] of Object.entries(raw)) {
    if (!flags || typeof flags !== "object" || Array.isArray(flags)) continue;
    /** @type {Record<string, boolean>} */
    const row = {};
    for (const flag of Object.values(ACTION_FLAGS)) {
      if (flags[flag]) {
        row[flag] = true;
      }
    }
    out[resource] = row;
  }
  return out;
}

/**
 * Fail closed: missing matrix / resource / action → false.
 *
 * @param {Record<string, Record<string, boolean>> | null | undefined} matrix
 * @param {string} resource
 * @param {PermissionAction} action
 */
export function matrixAllows(matrix, resource, action) {
  if (!matrix || !resource) return false;
  const flag = ACTION_FLAGS[action];
  if (!flag) return false;
  return Boolean(matrix[resource]?.[flag]);
}

/**
 * @param {string} pathname Locale-stripped path
 * @returns {string | null}
 */
export function permissionResourceForPath(pathname) {
  if (!pathname || typeof pathname !== "string") {
    return null;
  }

  let best = null;
  let bestLen = -1;

  for (const rule of PATH_PERMISSION_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      if (rule.prefix.length > bestLen) {
        best = rule.resource;
        bestLen = rule.prefix.length;
      }
    }
  }

  return best;
}

/**
 * Fetch + cache permission matrix for the signed-in tenant user.
 */
export function usePermissions() {
  const hasToken =
    typeof window !== "undefined" && Boolean(getSessionToken("tenant"));

  const query = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: async () => {
      const me = await fetchAuthMe();
      return normalizePermissionMatrix(me?.permissions);
    },
    enabled: hasToken,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const matrix = query.data ?? null;

  const can = useCallback(
    /** @param {string} resource @param {PermissionAction} action */
    (resource, action) => matrixAllows(matrix, resource, action),
    [matrix],
  );

  return {
    matrix,
    can,
    isLoading: hasToken && query.isPending && query.data == null,
    isError: query.isError,
    isReady: matrix != null,
    refetch: query.refetch,
  };
}

/**
 * @param {string} resource rbac resource_key
 */
export function useResourceAccess(resource) {
  const { can, isLoading, isReady, isError } = usePermissions();

  return useMemo(
    () => ({
      canView: can(resource, "view"),
      canAdd: can(resource, "add"),
      canEdit: can(resource, "edit"),
      canDelete: can(resource, "delete"),
      canImport: can(resource, "import"),
      canExport: can(resource, "export"),
      isLoading,
      isReady,
      isError,
    }),
    [can, resource, isLoading, isReady, isError],
  );
}
