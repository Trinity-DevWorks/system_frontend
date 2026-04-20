"use client";

import { Typography } from "antd";
import { useTranslations } from "next-intl";

export default function EmptyModulePage({ title }) {
  const t = useTranslations("PlaceholderPage");

  return (
    <div className="p-2">
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {title}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{t("subtitle")}</Typography.Paragraph>
    </div>
  );
}
