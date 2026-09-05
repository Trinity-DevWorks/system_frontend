/**
 * Client-side RBAC helpers.
 * Matrix comes from auth/login, auth/me, and branch-context (server remains source of truth).
 */

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { fetchAuthMe } from "@/lib/api/authMe";
import { AUTH_ME_QUERY_KEY } from "@/lib/auth-me";
import { getSessionToken } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";

/** @deprecated Matrix is derived from AUTH_ME_QUERY_KEY. Do not setQueryData this key. */
export const PERMISSIONS_QUERY_KEY = AUTH_ME_QUERY_KEY;

/** @typedef {"view" | "add" | "edit" | "delete" | "import" | "export"} PermissionAction */

const ACTION_FLAGS = /** @type {const} */ ({
  view: "can_view",
  add: "can_add",
  edit: "can_edit",
  delete: "can_delete",
  import: "can_import",
  export: "can_export",
});

/* Path -> rbac resource_key mapping lives with the features that declare it, in
   `features/registry.js`; see `permissionResourceForPath` there. */

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

/** Cookie store has no subscription; React re-reads the snapshot on render. */
function subscribeSessionToken() {
  return () => {};
}

function getTenantHasToken() {
  return Boolean(getSessionToken("tenant"));
}

function getServerHasToken() {
  return false;
}

/**
 * Fetch + cache permission matrix for the signed-in tenant user.
 *
 * Permission flags are withheld on the server snapshot so SSR HTML matches the
 * first client render (token + React Query cache are browser-only).
 */
export function usePermissions() {
  const hasToken = useSyncExternalStore(subscribeSessionToken, getTenantHasToken, getServerHasToken);

  const query = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: fetchAuthMe,
    enabled: hasToken,
    staleTime: QUERY_STALE_TIME.default,
    refetchOnWindowFocus: false,
    retry: 1,
    select: (me) => normalizePermissionMatrix(me?.permissions),
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
