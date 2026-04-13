"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button, Result } from "antd";

export default function TenantNotFoundPage() {
  const t = useTranslations("NotFound");
  const router = useRouter();

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      <Result
        status="404"
        title={t("title")}
        subTitle={t("subtitle")}
        extra={
          <Button type="primary" onClick={() => router.replace("/")}>
            {t("backHome")}
          </Button>
        }
      />
    </div>
  );
}
