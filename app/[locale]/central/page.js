"use client";

import { centralApi } from "@/API/CentralApiService";
import { useRouter } from "@/i18n/navigation";
import { clearSessionToken } from "@/lib/session";
import { App, Button, Card, Typography } from "antd";
import { useTranslations } from "next-intl";

export default function CentralPage() {
  const t = useTranslations("Central");
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await centralApi.logout();
    } catch {
      /* still clear session */
    }
    clearSessionToken("central");
    router.replace("/login");
  };

  return (
    <App>
      <div className="flex min-h-full flex-col items-center justify-center p-6">
        <Card
          className="w-full max-w-lg"
          title={t("title")}
          extra={
            <Button onClick={handleLogout} type="default">
              {t("logout")}
            </Button>
          }
        >
          <Typography.Paragraph type="secondary">
            {t("subtitle")}
          </Typography.Paragraph>
          <Typography.Paragraph>
            Connect central API actions here (users, tenants, plans, …).
          </Typography.Paragraph>
        </Card>
      </div>
    </App>
  );
}
