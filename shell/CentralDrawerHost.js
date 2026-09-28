/**
 * Central shell host for the current URL drawer. Gates on the central permission
 * matrix only (central pages have no tenant modules); rendering lives in `DrawerHost`.
 */

"use client";

import { CENTRAL_DRAWER_REGISTRY } from "@/features/central/drawerRegistry";
import { useCentralPermissions } from "@/lib/central-permissions";
import { canOpenFeatureDrawer } from "@/lib/drawer/drawerAccess";
import DrawerHost from "@/shell/DrawerHost";
import { useCallback, useMemo } from "react";

export default function CentralDrawerHost() {
  const { matrix, isLoading, isError } = useCentralPermissions();

  const check = useCallback(
    (feature, mode) =>
      canOpenFeatureDrawer(feature, mode, {
        moduleSet: null,
        matrix,
        permissionsError: isError,
      }),
    [matrix, isError],
  );

  const access = useMemo(() => ({ ready: !isLoading, check }), [isLoading, check]);

  return <DrawerHost drawerRegistry={CENTRAL_DRAWER_REGISTRY} access={access} />;
}
