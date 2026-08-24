"use client";

import {
  CORE_MODULE,
  moduleForPath,
  permissionResourceForPath,
} from "@/features/registry";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTenantModules } from "@/lib/tenant-modules";
import { matrixAllows, usePermissions } from "@/lib/permissions";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

/**
 * Redirects away from routes whose module is not entitled, or whose
 * permission matrix lacks view. Waits until modules + permissions have loaded.
 */
export default function ModuleRouteGuard({ children }) {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const router = useRouter();
  const { message } = App.useApp();
  const { moduleSet, isLoading: modulesLoading, isError: modulesError } = useTenantModules();
  const {
    matrix,
    isLoading: permissionsLoading,
    isError: permissionsError,
  } = usePermissions();
  const warnedPath = useRef(null);

  useEffect(() => {
    if (modulesLoading || permissionsLoading) {
      return;
    }

    const requiredModule = moduleForPath(pathname);
    if (requiredModule && requiredModule !== CORE_MODULE) {
      const entitled = modulesError
        ? false
        : moduleSet == null
          ? true
          : moduleSet.has(requiredModule);

      if (!entitled) {
        if (warnedPath.current !== pathname) {
          warnedPath.current = pathname;
          if (typeof message?.warning === "function") {
            message.warning(t("moduleNotEntitled"));
          }
        }
        router.replace("/main/overview");
        return;
      }
    }

    const requiredPermission = permissionResourceForPath(pathname);
    if (requiredPermission) {
      // Fail closed on fetch error or empty/missing matrix.
      const allowed =
        !permissionsError && matrixAllows(matrix ?? {}, requiredPermission, "view");

      if (!allowed) {
        if (warnedPath.current !== pathname) {
          warnedPath.current = pathname;
          if (typeof message?.warning === "function") {
            message.warning(t("permissionDenied"));
          }
        }
        router.replace("/main/overview");
      }
    }
  }, [
    modulesLoading,
    permissionsLoading,
    modulesError,
    permissionsError,
    moduleSet,
    matrix,
    pathname,
    router,
    message,
    t,
  ]);

  return children;
}
