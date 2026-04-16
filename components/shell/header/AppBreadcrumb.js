"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Breadcrumb, theme } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { buildBreadcrumbEntries } from "./build-breadcrumb-items";

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
        const title =
          !isLast && c.href ? (
            <Link
              href={c.href}
              style={{ color: token.colorTextDescription }}
              className="transition-colors hover:underline"
            >
              {c.title}
            </Link>
          ) : (
            <span
              className={isLast ? "font-medium" : undefined}
              style={{ color: isLast ? token.colorText : undefined }}
            >
              {c.title}
            </span>
          );
        return { key: c.key, title };
      }),
    [entries, token.colorText, token.colorTextDescription],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label={t("breadcrumbNav")} className="min-w-0 flex-1">
      <Breadcrumb
        className="[&_ol]:flex-nowrap [&_ol]:overflow-hidden [&_li]:max-w-[min(100%,14rem)] [&_li]:truncate"
        items={items}
      />
    </nav>
  );
}
