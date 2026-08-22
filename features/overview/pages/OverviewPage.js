"use client";

import { Typography } from "antd";
import { useTranslations } from "next-intl";

export default function OverviewPage() {
  const t = useTranslations("Overview");

  return (
    <div className="p-2">
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {t("title")}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{t("subtitle")}</Typography.Paragraph>
    </div>
  );
}
