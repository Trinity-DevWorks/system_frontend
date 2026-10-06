"use client";

import AuthSplitShell from "@/features/auth/components/AuthSplitShell";
import {
  fetchVendorInvoiceHistoryChallenge,
  unlockVendorInvoiceHistory,
} from "@/features/purchase-invoices/api/purchaseInvoices.api";
import { invoiceProofStatusTagColor } from "@/features/sales-invoices/utils/invoiceProofStatuses";
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

function historyStatusLabel(t, status) {
  if (status === "verified") return t("statusVerified");
  if (status === "tampered") return t("statusTampered");
  if (status === "not_registered") return t("statusNotRegistered");
  if (status === "pending_chain") return t("statusPendingChain");
  if (status === "waiting_company") return t("statusWaitingYou");
  if (status === "waiting_buyer") return t("statusWaitingCompany");
  if (status === "fully_approved") return t("statusApproved");
  if (status === "revoked") return t("statusRevoked");
  if (status === "disputed") return t("statusDisputed");
  return status ? String(status) : "—";
}

function invoiceHref(item, locale) {
  const id = typeof item.id === "string" ? item.id : "";
  const sig = typeof item.sig === "string" ? item.sig : "";
  if (id === "" || sig === "" || item.exp == null) return "";
  const qs = new URLSearchParams({ exp: String(item.exp), sig });
  return `${withLocalePrefix(locale, `/proofs/purchases/${id}`)}?${qs}`;
}

function VendorInvoiceHistoryInner({ initialHost }) {
  const t = useTranslations("InvoiceProofPortal");
  const tApiErrors = useTranslations("ApiErrors");
  const { notification } = App.useApp();
  const locale = useLocale();
  const [invoices, setInvoices] = useState(null);
  const challengeQuery = useQuery({
    queryKey: ["tenant", "vendor-invoice-history"],
    queryFn: fetchVendorInvoiceHistoryChallenge,
  });
  const challenge = challengeQuery.data && typeof challengeQuery.data === "object" ? challengeQuery.data : null;
  const errorCode = challengeQuery.isError ? getApiErrorCode(challengeQuery.error) : null;

  const signInMutation = useMutation({
    mutationFn: async () => {
      const fresh = await fetchVendorInvoiceHistoryChallenge();
      const messageToSign = typeof fresh?.message === "string" ? fresh.message : "";
      const nonce = typeof fresh?.nonce === "string" ? fresh.nonce : "";
      if (fresh?.locked !== true || messageToSign === "" || nonce === "") {
        throw new BuyerApprovalError("failed");
      }
      const signed = await signBuyerHistory({
        chainId: Number(fresh?.chain_id),
        message: messageToSign,
      });
      return unlockVendorInvoiceHistory({ ...signed, nonce });
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
        <Button type="primary" block size="large" loading={signInMutation.isPending} onClick={() => signInMutation.mutate()}>
          {t("historyConnect")}
        </Button>
      </>
    );
  } else if (invoices.length === 0) {
    body = <Alert type="info" showIcon title={t("historyEmpty")} />;
  } else {
    body = (
      <div className="flex flex-col gap-2">
        {invoices.map((item) => {
          const href = invoiceHref(item, locale);
          return (
            <a
              key={item.id || item.invoice_number}
              href={href || undefined}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ant-color-border-secondary)] px-3 py-2 text-sm text-inherit no-underline"
            >
              <span>
                {item.invoice_number || "—"}
                {" · "}
                {formatTenantDate(item.invoice_date) || "—"}
                {" · "}
                {formatTenantMoney(item.grand_total, item.currency_code)}
              </span>
              <Tag color={invoiceProofStatusTagColor(item.status)}>{historyStatusLabel(t, item.status)}</Tag>
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <AuthSplitShell isCentral={mode.isCentral} tenantLabel={tenantLabel} scrollable documentLayout>
      {body}
    </AuthSplitShell>
  );
}

export default function VendorInvoiceHistoryPage({ initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <VendorInvoiceHistoryInner initialHost={initialHost} />
    </App>
  );
}
