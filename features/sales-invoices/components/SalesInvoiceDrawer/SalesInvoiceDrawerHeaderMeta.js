"use client";

import { salesInvoiceStatusTag } from "../../utils/salesInvoiceStatuses";
import InvoiceChainIssueTag from "../InvoiceChainIssueTag";
import SafeConfirmationChip from "@/shared/components/SafeConfirmationChip";
import { Tag } from "antd";

/**
 * @param {unknown} user
 * @returns {string | null}
 */
export function postedByDisplayName(user) {
  if (!user || typeof user !== "object") return null;
  const name = "name" in user && typeof user.name === "string" ? user.name.trim() : "";
  return name || null;
}

/**
 * Compact document meta for the sales-invoice drawer header.
 *
 * @param {{
 *   t: (key: string, values?: Record<string, string | number>) => string;
 *   invoiceStatus?: string | null;
 *   paidTotal?: unknown;
 *   netToPay?: unknown;
 *   chainIssue?: { kind: string; checked_at: string | null } | null;
 *   safeCompanyQueue?: import("@/lib/safe-company-approval-queue").SafeCompanyApprovalQueue | null;
 * }} props
 */
export default function SalesInvoiceDrawerHeaderMeta({
  t,
  invoiceStatus = null,
  paidTotal,
  netToPay,
  chainIssue = null,
  safeCompanyQueue = null,
}) {
  const tag = invoiceStatus ? salesInvoiceStatusTag(t, invoiceStatus, paidTotal, netToPay) : null;
  return (
    <div className="sales-invoice-drawer-header-meta gap-2">
      {tag ? (
        <Tag className="m-0" color={tag.color}>
          {tag.label}
        </Tag>
      ) : (
        "—"
      )}
      <SafeConfirmationChip t={t} queue={safeCompanyQueue} />
      <InvoiceChainIssueTag issue={chainIssue} />
    </div>
  );
}
