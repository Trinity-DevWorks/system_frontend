"use client";

import {
  PLATFORM_EMAIL_QUERY_KEY,
  PLATFORM_EMAIL_TEMPLATES_QUERY_KEY,
  PLATFORM_EMAIL_TYPES,
  fetchPlatformEmail,
  fetchPlatformEmailTemplates,
  resetPlatformEmailTemplate,
  savePlatformEmailTemplate,
  sendPlatformTestEmail,
  updatePlatformEmail,
} from "../api/platformEmail.api";
import { useCentralResourceAccess } from "@/lib/central-permissions";
import EmailTemplatesCard from "@/shared/components/email/EmailTemplatesCard";
import MailboxSettingsCard from "@/shared/components/email/MailboxSettingsCard";
import { Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * Central Settings → Email: the platform mailbox every account email (password resets) goes through,
 * and those emails' texts. Same form as tenant Settings → Email, without "Copy to me".
 */
export default function PlatformEmailPage() {
  const t = useTranslations("CentralPlatformEmail");
  const { canEdit } = useCentralResourceAccess("platform_email");
  const readOnly = !canEdit;

  const types = useMemo(() => PLATFORM_EMAIL_TYPES.map((value) => ({ value, label: t(`type_${value}`) })), [t]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto p-4">
      <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-3">
        <Typography.Title level={4} className="!mb-0">
          {t("title")}
        </Typography.Title>
        <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
        <MailboxSettingsCard
          namespace="CentralPlatformEmail"
          queryKey={PLATFORM_EMAIL_QUERY_KEY}
          fetchSettings={fetchPlatformEmail}
          updateSettings={updatePlatformEmail}
          sendTest={() => sendPlatformTestEmail()}
          readOnly={readOnly}
          showBcc={false}
          fromPlaceholder="no-reply@yourplatform.com"
        />
        <EmailTemplatesCard
          readOnly={readOnly}
          namespace="CentralPlatformEmail"
          queryKey={PLATFORM_EMAIL_TEMPLATES_QUERY_KEY}
          fetchTemplates={fetchPlatformEmailTemplates}
          saveTemplate={savePlatformEmailTemplate}
          resetTemplate={resetPlatformEmailTemplate}
          types={types}
        />
      </div>
    </div>
  );
}
