"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import {
  CORE_MODULE,
  moduleForPath,
  useTenantModules,
} from "@/lib/tenant-modules";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

/**
 * Redirects away from routes whose module is not entitled.
 * Waits until assigned-modules have loaded; on fetch error, only core routes stay.
 */
export default function ModuleRouteGuard({ children }) {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const router = useRouter();
  const { message } = App.useApp();
  const { moduleSet, isLoading, isError } = useTenantModules();
  const warnedPath = useRef(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const required = moduleForPath(pathname);
    if (!required || required === CORE_MODULE) {
      return;
    }

    const entitled = isError
      ? false
      : moduleSet == null
        ? true
        : moduleSet.has(required);

    if (entitled) {
      return;
    }

    if (warnedPath.current !== pathname) {
      warnedPath.current = pathname;
      if (typeof message?.warning === "function") {
        message.warning(t("moduleNotEntitled"));
      }
    }

    router.replace("/main/overview");
  }, [isLoading, isError, moduleSet, pathname, router, message, t]);

  return children;
}
