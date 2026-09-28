"use client";

import InvoiceVerifiersCard from "../components/InvoiceVerifiersCard";
import { useCompanySettings } from "@/lib/company-settings";
import { useResourceAccess } from "@/lib/permissions";
import { Alert, Spin } from "antd";
import { useTranslations } from "next-intl";

export default function InvoiceVerifiersPage() {
  const t = useTranslations("InvoiceVerifiers");
  const { settings, isReady } = useCompanySettings();
  const access = useResourceAccess("invoice_proofs");

  if (!isReady) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl min-h-0 min-w-0 flex-col gap-4 pb-6 pt-2">
      {settings.invoiceProofsEnabled ? (
        <InvoiceVerifiersCard canEdit={access.canEdit} />
      ) : (
        <Alert type="info" showIcon title={t("disabled")} />
      )}
    </div>
  );
}
