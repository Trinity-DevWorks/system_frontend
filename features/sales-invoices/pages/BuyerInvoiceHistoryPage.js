"use client";

import AuthSplitShell from "@/features/auth/components/AuthSplitShell";
import {
  fetchBuyerInvoiceHistoryChallenge,
  unlockBuyerInvoiceHistory,
} from "../api/salesInvoices.api";
import { invoiceProofStatusTagColor } from "../utils/invoiceProofStatuses";
import { BuyerApprovalError } from "@/lib/invoice-registry-buyer-approval";
import { signBuyerHistory } from "@/lib/invoice-proof-portal-unlock";
import { getApiErrorCode, getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { withLocalePrefix } from "@/lib/locale-path";
import { formatTenantDate, formatTenantMoney } from "@/lib/tenant-format";
import { resolveHostMode } from "@/lib/runtime-mode";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Alert, Button, Tag, Typography } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

/**
 * @param {string | null | undefined} status
 * @param {(key: string) => string} t
 */
function historyStatusLabel(t, status) {
  if (status === "verified") return t("statusVerified");
  if (status === "tampered") return t("statusTampered");
  if (status === "not_registered") return t("statusNotRegistered");
  if (status === "pending_chain") return t("statusPendingChain");
  if (status === "waiting_company") return t("statusWaitingCompany");
  if (status === "waiting_buyer") return t("statusWaitingYou");
  if (status === "fully_approved") return t("statusApproved");
  if (status === "revoked") return t("statusRevoked");
  if (status === "disputed") return t("statusDisputed");
  return status ? String(status) : "—";
}

/**
 * @param {{ exp?: unknown; sig?: unknown; id?: unknown }} item
 * @param {string} locale
 */
function invoiceHref(item, locale) {
  const id = typeof item.id === "string" ? item.id : "";
  const sig = typeof item.sig === "string" ? item.sig : "";
  if (id === "" || sig === "" || item.exp == null) return "";
  const qs = new URLSearchParams({ exp: String(item.exp), sig });
  return `${withLocalePrefix(locale, `/proofs/${id}`)}?${qs}`;
}

/**
 * @param {{ initialHost: string }} props
 */
function BuyerInvoiceHistoryInner({ initialHost }) {
  const t = useTranslations("InvoiceProofPortal");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const locale = useLocale();
  const [invoices, setInvoices] = useState(null);
  const challengeQuery = useQuery({
    queryKey: ["tenant", "buyer-invoice-history"],
    queryFn: fetchBuyerInvoiceHistoryChallenge,
  });
  const challenge = challengeQuery.data && typeof challengeQuery.data === "object" ? challengeQuery.data : null;
  const errorCode = challengeQuery.isError ? getApiErrorCode(challengeQuery.error) : null;

  const signInMutation = useMutation({
    mutationFn: async () => {
      const fresh = await fetchBuyerInvoiceHistoryChallenge();
      const messageToSign = typeof fresh?.message === "string" ? fresh.message : "";
      const nonce = typeof fresh?.nonce === "string" ? fresh.nonce : "";
      if (fresh?.locked !== true || messageToSign === "" || nonce === "") {
        throw new BuyerApprovalError("failed");
      }
      const signed = await signBuyerHistory({
        chainId: Number(fresh?.chain_id),
        message: messageToSign,
      });
      return unlockBuyerInvoiceHistory({ ...signed, nonce });
    },
    onError: (err) => {
      const code = err instanceof BuyerApprovalError ? err.code : getApiErrorCode(err);
      let description = t("loadError");
      if (code === "missing_wallet") description = t("walletMissing");
      else if (code === "wrong_network") description = t("wrongNetwork");
      else if (code === "rejected") description = t("rejected");
      else description = getLocalizedApiErrorMessage(tApiErrors, err) || description;
      notification.error({ title: t("historyTitle"), description });
    },
    onSuccess: (result) => {
      setInvoices(Array.isArray(result) ? result : []);
    },
  });

  const mode = resolveHostMode(initialHost);
  const tenantLabel = mode.tenantSlug
    ? mode.tenantSlug.charAt(0).toUpperCase() + mode.tenantSlug.slice(1)
    : "Your";

  let body;
  if (errorCode === "INVOICE_PROOFS_DISABLED") {
    body = <Alert type="warning" showIcon title={t("disabledTitle")} description={t("disabled")} />;
  } else if (challengeQuery.isError) {
    body = (
      <Alert
        type="error"
        showIcon
        title={t("loadError")}
        description={getLocalizedApiErrorMessage(tApiErrors, challengeQuery.error) || t("loadError")}
      />
    );
  } else if (invoices == null) {
    body = (
      <>
        <div className="mb-6 text-center">
          <Typography.Title level={3} className="!mb-1 !mt-0">
            {challenge?.company_name || t("historyTitle")}
          </Typography.Title>
          <Typography.Paragraph className="!mb-0 !text-sm !text-[var(--ant-color-text-secondary)]">
            {t("historySubtitle")}
          </Typography.Paragraph>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="primary" loading={signInMutation.isPending || challengeQuery.isLoading} onClick={() => signInMutation.mutate()}>
            {t("historyConnect")}
          </Button>
        </div>
      </>
    );
  } else if (invoices.length === 0) {
    body = <Alert type="info" showIcon title={t("historyTitle")} description={t("historyEmpty")} />;
  } else {
    body = (
      <>
        <Typography.Title level={3} className="!mb-4 !mt-0">
          {t("historyTitle")}
        </Typography.Title>
        <div className="flex flex-col gap-3">
          {invoices.map((item) => {
            const href = invoiceHref(item, locale);
            const total = formatTenantMoney(item.grand_total);
            const currency = typeof item.currency_code === "string" ? item.currency_code : "";
            return (
              <a
                key={String(item.id)}
                href={href || undefined}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ant-color-border-secondary)] px-4 py-3 text-inherit no-underline transition-colors hover:bg-[var(--ant-color-fill-quaternary)]"
              >
                <span>
                  <span className="block font-medium">{item.invoice_number || "—"}</span>
                  <span className="text-sm text-[var(--ant-color-text-secondary)]">
                    {formatTenantDate(item.invoice_date) || "—"}
                    {total ? ` · ${total}${currency ? ` ${currency}` : ""}` : ""}
                  </span>
                </span>
                <Tag color={invoiceProofStatusTagColor(item.status)}>{historyStatusLabel(t, item.status)}</Tag>
              </a>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <AuthSplitShell isCentral={mode.isCentral} tenantLabel={tenantLabel} scrollable documentLayout>
      {body}
    </AuthSplitShell>
  );
}

/**
 * @param {{ initialHost: string }} props
 */
export default function BuyerInvoiceHistoryPage({ initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <BuyerInvoiceHistoryInner initialHost={initialHost} />
    </App>
  );
}
