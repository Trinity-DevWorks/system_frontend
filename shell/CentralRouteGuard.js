"use client";

import {
  CENTRAL_FEATURES,
  CENTRAL_HOME_PATH,
  centralPermissionResourceForPath,
} from "@/features/central/registry";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useCentralPermissions } from "@/lib/central-permissions";
import { matrixAllows } from "@/lib/permissions";
import { App, Result } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";

/**
 * Redirects away from central routes whose resource lacks `view` in the central
 * permission matrix. UX only: every central admin endpoint is gated by
 * `check.central.permission` on the backend.
 */
export default function CentralRouteGuard({ children }) {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const router = useRouter();
  const { message } = App.useApp();
  const { matrix, isLoading, isReady, isError } = useCentralPermissions();
  const warnedPath = useRef(null);

  const settled = !isLoading && (isReady || isError);
  const requiredPermission = centralPermissionResourceForPath(pathname);
  // Fail closed on fetch error or missing matrix.
  const allowed =
    !requiredPermission ||
    (!isError && matrixAllows(matrix ?? {}, requiredPermission, "view"));

  const redirectTarget = useMemo(() => {
    if (isError) return null;
    if (pathname !== CENTRAL_HOME_PATH && matrixAllows(matrix ?? {}, "overview", "view")) {
      return CENTRAL_HOME_PATH;
    }
    const first = CENTRAL_FEATURES.find(
      (f) =>
        f.nav !== false &&
        f.path !== pathname &&
        f.permission &&
        matrixAllows(matrix ?? {}, f.permission, "view"),
    );
    return first?.path ?? null;
  }, [isError, matrix, pathname]);

  useEffect(() => {
    if (!settled || allowed) return;
    if (warnedPath.current !== pathname) {
      warnedPath.current = pathname;
      if (typeof message?.warning === "function") {
        message.warning(t("permissionDenied"));
      }
    }
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [settled, allowed, pathname, redirectTarget, router, message, t]);

  if (settled && !allowed) {
    return redirectTarget ? null : <Result status="403" title={t("permissionDenied")} />;
  }

  return children;
}
