"use client";

import { useResourceAccess } from "@/lib/permissions";
import EmailTemplatesCard from "@/shared/components/email/EmailTemplatesCard";
import MailboxSettingsCard from "@/shared/components/email/MailboxSettingsCard";
import { Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  DOCUMENT_EMAIL_TYPES,
  EMAIL_SETTINGS_QUERY_KEY,
  EMAIL_TEMPLATES_QUERY_KEY,
  fetchEmailSettings,
  fetchEmailTemplates,
  resetEmailTemplate,
  saveEmailTemplate,
  sendTestEmail,
  updateEmailSettings,
} from "../api/documentEmail.api";

/** Tenant Settings → Email: the company's own mailbox for documents, and each document's email text. */
export default function EmailSettingsPage() {
  const t = useTranslations("EmailSettings");
  const tDoc = useTranslations("DocumentEmail");
  const access = useResourceAccess("email_settings");
  const readOnly = !access.canEdit;

  const types = useMemo(
    () => DOCUMENT_EMAIL_TYPES.map((value) => ({ value, label: tDoc(`type_${value}`) })),
    [tDoc],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto p-4">
      <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-3">
        <Typography.Title level={4} className="!mb-0">
          {t("title")}
        </Typography.Title>
        <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
        <MailboxSettingsCard
          namespace="EmailSettings"
          queryKey={EMAIL_SETTINGS_QUERY_KEY}
          fetchSettings={fetchEmailSettings}
          updateSettings={updateEmailSettings}
          sendTest={() => sendTestEmail()}
          readOnly={readOnly}
        />
        <EmailTemplatesCard
          readOnly={readOnly}
          namespace="EmailSettings"
          queryKey={EMAIL_TEMPLATES_QUERY_KEY}
          fetchTemplates={fetchEmailTemplates}
          saveTemplate={saveEmailTemplate}
          resetTemplate={resetEmailTemplate}
          types={types}
        />
      </div>
    </div>
  );
}
