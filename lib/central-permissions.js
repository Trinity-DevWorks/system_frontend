/**
 * Client-side central RBAC helpers (platform admin area).
 * Matrix comes from central login and `/api/auth/me`; the backend
 * `check.central.permission` middleware remains the source of truth.
 */

import { fetchCentralAuthMe } from "@/lib/api/centralAuthMe";
import { CENTRAL_AUTH_ME_QUERY_KEY } from "@/lib/central-auth-me";
import { matrixAllows, normalizePermissionMatrix } from "@/lib/permissions";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { getSessionToken } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";

/** Cookie store has no subscription; React re-reads the snapshot on render. */
function subscribeSessionToken() {
  return () => {};
}

function getCentralHasToken() {
  return Boolean(getSessionToken("central"));
}

function getServerHasToken() {
  return false;
}

/**
 * Fetch + cache the permission matrix for the signed-in central user.
 * Same SSR/hydration rule as `usePermissions`: flags stay off until the
 * client token snapshot is read.
 */
export function useCentralPermissions() {
  const hasToken = useSyncExternalStore(subscribeSessionToken, getCentralHasToken, getServerHasToken);

  const query = useQuery({
    queryKey: CENTRAL_AUTH_ME_QUERY_KEY,
    queryFn: fetchCentralAuthMe,
    enabled: hasToken,
    staleTime: QUERY_STALE_TIME.default,
    refetchOnWindowFocus: false,
    retry: 1,
    select: (me) => normalizePermissionMatrix(me?.permissions),
  });

  const matrix = hasToken ? (query.data ?? null) : null;

  const can = useCallback(
    /** @param {string} resource @param {import("@/lib/permissions").PermissionAction} action */
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
 * @param {string} resource central rbac resource_key (config/central_rbac.php)
 */
export function useCentralResourceAccess(resource) {
  const { can, isLoading, isReady, isError } = useCentralPermissions();

  return useMemo(
    () => ({
      canView: can(resource, "view"),
      canAdd: can(resource, "add"),
      canEdit: can(resource, "edit"),
      canDelete: can(resource, "delete"),
      canExport: can(resource, "export"),
      isLoading,
      isReady,
      isError,
    }),
    [can, resource, isLoading, isReady, isError],
  );
}
