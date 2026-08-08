"use client";

import EmptyModulePage from "@/components/shared/EmptyModulePage";
import { useTranslations } from "next-intl";

export default function AuditLogPage() {
  const t = useTranslations("Shell");
  return <EmptyModulePage title={t("navAuditLog")} />;
}
