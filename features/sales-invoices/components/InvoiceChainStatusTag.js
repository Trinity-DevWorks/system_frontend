"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { getInvoiceProofStatusLabel, invoiceProofStatusTagColor } from "../utils/invoiceProofStatuses";
import InvoiceChainIssueTag from "./InvoiceChainIssueTag";
import { Tag, Tooltip } from "antd";
import { useTranslations } from "next-intl";

/**
 * Last blockchain status stored for an invoice. A chain-check issue takes priority.
 *
 * @param {{
 *   status?: { status: string; financed: boolean; checked_at: string | null } | null;
 *   issue?: { kind: string; checked_at: string | null } | null;
 * }} props
 */
export default function InvoiceChainStatusTag({ status, issue }) {
  const t = useTranslations("SalesInvoices");

  if (issue?.kind) return <InvoiceChainIssueTag issue={issue} />;
  if (!status?.status) return "\u2014";

  let label = getInvoiceProofStatusLabel(t, status.status);
  let color = invoiceProofStatusTagColor(status.status);
  if (status.status === "failed") {
    label = t("chainStatusFailed");
    color = "error";
  } else if (status.financed) {
    label = t("chainStatusFinanced");
    color = "gold";
  }

  const checkedAt = status.checked_at ? formatTenantDateTime(status.checked_at) : "";

  return (
    <Tooltip title={checkedAt ? t("chainStatusCheckedAt", { date: checkedAt }) : undefined}>
      <Tag color={color} className="!m-0">
        {label}
      </Tag>
    </Tooltip>
  );
}
