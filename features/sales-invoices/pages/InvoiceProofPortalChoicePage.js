"use client";

import AuthSplitShell from "@/features/auth/components/AuthSplitShell";
import { withLocalePrefix } from "@/lib/locale-path";
import { resolveHostMode } from "@/lib/runtime-mode";
import { App, Typography } from "antd";
import { useLocale, useTranslations } from "next-intl";

/**
 * @param {{ href: string; title: string; hint: string }} props
 */
function PortalChoice({ href, title, hint }) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-[var(--ant-color-border-secondary)] px-4 py-5 text-inherit no-underline transition-colors hover:bg-[var(--ant-color-fill-quaternary)]"
    >
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-1 text-sm text-[var(--ant-color-text-secondary)]">{hint}</div>
    </a>
  );
}

/**
 * @param {{ initialHost: string }} props
 */
function InvoiceProofPortalChoiceInner({ initialHost }) {
  const t = useTranslations("InvoiceProofPortal");
  const locale = useLocale();
  const mode = resolveHostMode(initialHost);
  const tenantLabel = mode.tenantSlug
    ? mode.tenantSlug.charAt(0).toUpperCase() + mode.tenantSlug.slice(1)
    : "Your";

  return (
    <AuthSplitShell isCentral={mode.isCentral} tenantLabel={tenantLabel} scrollable documentLayout wide>
      <div className="mb-6 text-center">
        <Typography.Title level={3} className="!mb-1 !mt-0">
          {t("chooseTitle")}
        </Typography.Title>
        <Typography.Paragraph className="!mb-0 !text-sm !text-[var(--ant-color-text-secondary)]">
          {t("chooseSubtitle")}
        </Typography.Paragraph>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PortalChoice
          href={withLocalePrefix(locale, "/proofs/verify")}
          title={t("chooseVerify")}
          hint={t("chooseVerifyHint")}
        />
        <PortalChoice
          href={withLocalePrefix(locale, "/proofs/sales")}
          title={t("chooseSales")}
          hint={t("chooseSalesHint")}
        />
        <PortalChoice
          href={withLocalePrefix(locale, "/proofs/purchases")}
          title={t("choosePurchases")}
          hint={t("choosePurchasesHint")}
        />
      </div>
    </AuthSplitShell>
  );
}

/**
 * @param {{ initialHost: string }} props
 */
export default function InvoiceProofPortalChoicePage({ initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <InvoiceProofPortalChoiceInner initialHost={initialHost} />
    </App>
  );
}
