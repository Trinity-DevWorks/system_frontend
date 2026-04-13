"use client";

import { Button, Space, Typography } from "antd";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("Home");

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-8">
      <Space orientation="vertical" align="center" size="large">
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t("title")}
        </Typography.Title>
        <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
        <Button type="primary">{t("cta")}</Button>
      </Space>
    </div>
  );
}
