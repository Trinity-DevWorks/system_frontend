"use client";

import { ROUTES } from "@/features/registry";
import { useResourceAccess } from "@/lib/permissions";
import { Alert, Button } from "antd";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";
import { withLocalePrefix } from "@/lib/locale-path";
import { useScaleExportStatus } from "../hooks/useScaleExportStatus";

/**
 * "N items changed since the last export to the scales" — shown on scale settings pages.
 *
 * @param {{ showLink?: boolean; className?: string }} props
 */
export default function ScaleOutdatedBanner({ showLink = true, className = "" }) {
  const t = useTranslations("ScaleExports");
  const locale = useLocale();
  const access = useResourceAccess("scale_exports");
  const status = useScaleExportStatus(access.canView);
  const changed = status.changedTotal;
  if (!access.canView || !status.data || changed <= 0) return null;

  return (
    <Alert
      className={className}
      type="warning"
      showIcon
      title={t("outdatedBanner", { count: changed })}
      action={
        showLink ? (
          <Link href={withLocalePrefix(locale, ROUTES.scaleExport)}>
            <Button size="small">{t("openScaleExport")}</Button>
          </Link>
        ) : null
      }
    />
  );
}
