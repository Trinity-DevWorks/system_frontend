"use client";

/**
 * Settings workspace chrome: title, description, secondary nav, and page body.
 * Used by app/[locale]/main/settings/layout.js.
 */

import { Typography, theme } from "antd";
import { useTranslations } from "next-intl";
import SettingsSecondaryNav from "./SettingsSecondaryNav";

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export default function SettingsWorkspace({ children }) {
  const t = useTranslations("Shell");
  const { token } = theme.useToken();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-1 sm:p-2">
      <header className="shrink-0">
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t("navSettings")}
        </Typography.Title>
        <Typography.Paragraph
          type="secondary"
          style={{ marginTop: token.marginXXS, marginBottom: 0 }}
        >
          {t("settingsDescription")}
        </Typography.Paragraph>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 md:flex-row md:gap-6">
        <SettingsSecondaryNav />
        <div
          className="min-h-0 min-w-0 flex-1 border-t pt-4 md:border-s md:border-t-0 md:ps-6 md:pt-0"
          style={{ borderColor: token.colorBorderSecondary }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
