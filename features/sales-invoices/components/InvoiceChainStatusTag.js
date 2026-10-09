"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import {
  getInvoiceProofStatusLabel,
  getPurchaseInvoiceProofStatusLabel,
  invoiceProofStatusTagColor,
} from "../utils/invoiceProofStatuses";
import InvoiceChainIssueTag from "./InvoiceChainIssueTag";
import { Tag, Tooltip } from "antd";
import { useTranslations } from "next-intl";

/**
 * Last blockchain status stored for an invoice. A chain-check issue takes priority.
 *
 * @param {{
 *   status?: { status: string; financed: boolean; checked_at: string | null } | null;
 *   issue?: { kind: string; checked_at: string | null } | null;
 *   variant?: "sales" | "purchase";
 * }} props
 */
export default function InvoiceChainStatusTag({ status, issue, variant = "sales" }) {
  const t = useTranslations("SalesInvoices");
  const tPurchase = useTranslations("PurchaseInvoices");

  if (issue?.kind) return <InvoiceChainIssueTag issue={issue} />;
  if (!status?.status) return "\u2014";

  let label =
    variant === "purchase"
      ? getPurchaseInvoiceProofStatusLabel(tPurchase, t, status.status)
      : getInvoiceProofStatusLabel(t, status.status);
  let color = invoiceProofStatusTagColor(status.status);
  if (status.status === "failed") {
    label = t("chainStatusFailed");
    color = "error";
  }

  const checkedAt = status.checked_at ? formatTenantDateTime(status.checked_at) : "";
  const tip = checkedAt ? t("chainStatusCheckedAt", { date: checkedAt }) : undefined;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Tooltip title={tip}>
        <Tag color={color} className="!m-0">
          {label}
        </Tag>
      </Tooltip>
      {status.financed ? (
        <Tooltip title={tip}>
          <Tag color="gold" className="!m-0">
            {t("chainStatusFinanced")}
          </Tag>
        </Tooltip>
      ) : null}
    </span>
  );
}
