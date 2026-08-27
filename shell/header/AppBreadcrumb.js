"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { HomeOutlined } from "@ant-design/icons";
import { Breadcrumb, theme } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { ROUTES } from "@/features/registry";
import { buildBreadcrumbEntries } from "@/shell/header/build-breadcrumb-items";

/**
 * Shell breadcrumb: labels follow the sidebar nav where possible; unknown segments are humanized.
 */
export default function AppBreadcrumb({ menuItems }) {
  const pathname = usePathname();
  const t = useTranslations("Shell");
  const { token } = theme.useToken();

  const entries = useMemo(
    () => buildBreadcrumbEntries(pathname, menuItems, t),
    [menuItems, pathname, t],
  );

  const items = useMemo(
    () =>
      entries.map((c, index) => {
        const isLast = index === entries.length - 1;
        const isRoot = c.key === ROUTES.overview && c.title === t("breadcrumbRoot");
        const title =
          isRoot ? (
            c.href ? (
              <Link
                href={c.href}
                aria-label={t("breadcrumbRoot")}
                title={t("breadcrumbRoot")}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: token.colorTextDescription }}
              >
                <HomeOutlined />
              </Link>
            ) : (
              <span
                aria-label={t("breadcrumbRoot")}
                title={t("breadcrumbRoot")}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md"
                style={{ color: token.colorTextDescription }}
              >
                <HomeOutlined />
              </span>
            )
          ) : !isLast && c.href ? (
            <Link
              href={c.href}
              style={{ color: token.colorTextDescription }}
              className="text-xs transition-colors hover:underline"
            >
              {c.title}
            </Link>
          ) : (
            <span
              className={isLast ? "text-xs font-medium" : "text-xs"}
              style={{ color: isLast ? token.colorText : undefined }}
            >
              {c.title}
            </span>
          );
        return { key: c.key, title };
      }),
    [entries, t, token.colorText, token.colorTextDescription],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label={t("breadcrumbNav")} className="min-w-0 w-fit max-w-full">
      <Breadcrumb
        className="[&_ol]:flex-nowrap [&_ol]:overflow-hidden [&_li]:max-w-[min(100%,14rem)] [&_li]:truncate"
        items={items}
      />
    </nav>
  );
}
