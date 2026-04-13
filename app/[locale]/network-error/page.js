"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button, Result, Space } from "antd";

export default function NetworkErrorPage() {
  const t = useTranslations("NetworkError");
  const router = useRouter();

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      <Result
        status="500"
        title={t("title")}
        subTitle={t("subtitle")}
        extra={
          <Space>
            <Button type="primary" onClick={() => window.location.reload()}>
              {t("tryAgain")}
            </Button>
            <Button onClick={() => router.replace("/")}>{t("backHome")}</Button>
          </Space>
        }
      />
    </div>
  );
}
