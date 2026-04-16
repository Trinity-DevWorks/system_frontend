"use client";

import { Card, Typography } from "antd";
import { useTranslations } from "next-intl";

export default function CentralPage() {
  const t = useTranslations("Central");

  return (
    <Card className="max-w-lg" title={t("title")}>
      <Typography.Paragraph type="secondary">{t("subtitle")}</Typography.Paragraph>
      <Typography.Paragraph>
        Connect central API actions here (users, tenants, plans, ...).
      </Typography.Paragraph>
    </Card>
  );
}
