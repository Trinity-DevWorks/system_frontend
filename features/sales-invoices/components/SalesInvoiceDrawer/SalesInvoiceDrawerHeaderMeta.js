"use client";

import { getSalesInvoiceStatusLabel, salesInvoiceStatusTagColor } from "../../utils/salesInvoiceStatuses";
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
 *   chainIssue?: { kind: string; checked_at: string | null } | null;
 *   safeCompanyQueue?: import("@/lib/safe-company-approval-queue").SafeCompanyApprovalQueue | null;
 * }} props
 */
export default function SalesInvoiceDrawerHeaderMeta({
  t,
  invoiceStatus = null,
  chainIssue = null,
  safeCompanyQueue = null,
}) {
  return (
    <div className="sales-invoice-drawer-header-meta gap-2">
      {invoiceStatus ? (
        <Tag className="m-0" color={salesInvoiceStatusTagColor(invoiceStatus)}>
          {getSalesInvoiceStatusLabel(t, invoiceStatus)}
        </Tag>
      ) : (
        "\u2014"
      )}
      <SafeConfirmationChip t={t} queue={safeCompanyQueue} />
      <InvoiceChainIssueTag issue={chainIssue} />
    </div>
  );
}
