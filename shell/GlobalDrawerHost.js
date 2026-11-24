/**
 * Tenant shell host for the current URL drawer (this page or `?open=` foreign).
 * Gates on tenant module entitlement + tenant RBAC; rendering lives in `DrawerHost`.
 */

"use client";

import { canOpenFeatureDrawer } from "@/lib/drawer/drawerAccess";
import { DRAWER_REGISTRY } from "@/lib/drawer/drawerRegistry";
import { usePermissions } from "@/lib/permissions";
import { useTenantModules } from "@/lib/tenant-modules";
import DrawerHost from "@/shell/DrawerHost";
import { useCallback, useMemo } from "react";

export default function GlobalDrawerHost() {
  const { moduleSet, isLoading: modulesLoading, isError: modulesError } = useTenantModules();
  const {
    matrix,
    isLoading: permissionsLoading,
    isError: permissionsError,
  } = usePermissions();

  const check = useCallback(
    (feature, mode) =>
      canOpenFeatureDrawer(feature, mode, {
        moduleSet,
        modulesError,
        matrix,
        permissionsError,
      }),
    [moduleSet, modulesError, matrix, permissionsError],
  );

  const access = useMemo(
    () => ({ ready: !modulesLoading && !permissionsLoading, check }),
    [modulesLoading, permissionsLoading, check],
  );

  return <DrawerHost drawerRegistry={DRAWER_REGISTRY} access={access} />;
}
