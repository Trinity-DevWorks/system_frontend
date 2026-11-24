"use client";

import { CENTRAL_HOME_PATH, centralFeatureForPath } from "@/features/central/registry";
import { Link, usePathname } from "@/i18n/navigation";
import { HomeOutlined } from "@ant-design/icons";
import { Breadcrumb, theme } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * Central shell breadcrumb: home → current central page (flat routes, one level).
 */
export default function CentralBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("CentralShell");
  const tShell = useTranslations("Shell");
  const { token } = theme.useToken();

  const items = useMemo(() => {
    const feature = centralFeatureForPath(pathname);
    const home = {
      key: CENTRAL_HOME_PATH,
      title: (
        <Link
          href={CENTRAL_HOME_PATH}
          aria-label={t("breadcrumbRoot")}
          title={t("breadcrumbRoot")}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: token.colorTextDescription }}
        >
          <HomeOutlined />
        </Link>
      ),
    };
    if (!feature || feature.path === CENTRAL_HOME_PATH) {
      return [
        home,
        {
          key: "current",
          title: (
            <span className="text-xs font-medium" style={{ color: token.colorText }}>
              {t("navOverview")}
            </span>
          ),
        },
      ];
    }
    const label = feature.labelKey ? t(feature.labelKey) : tShell("profile");
    return [
      home,
      {
        key: feature.path,
        title: (
          <span className="text-xs font-medium" style={{ color: token.colorText }}>
            {label}
          </span>
        ),
      },
    ];
  }, [pathname, t, tShell, token.colorText, token.colorTextDescription]);

  return (
    <nav aria-label={tShell("breadcrumbNav")} className="min-w-0 w-fit max-w-full">
      <Breadcrumb
        className="[&_ol]:flex-nowrap [&_ol]:overflow-hidden [&_li]:max-w-[min(100%,14rem)] [&_li]:truncate"
        items={items}
      />
    </nav>
  );
}
