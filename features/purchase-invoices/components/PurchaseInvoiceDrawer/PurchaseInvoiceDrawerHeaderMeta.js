"use client";

import {
  getPurchaseInvoiceStatusLabel,
  purchaseInvoiceStatusTagColor,
} from "../../utils/purchaseInvoiceStatuses";
import InvoiceChainIssueTag from "@/features/sales-invoices/components/InvoiceChainIssueTag";
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
 * @param {{
 *   t: (key: string, values?: Record<string, string | number>) => string;
 *   invoiceStatus?: string | null;
 *   chainIssue?: { kind: string; checked_at: string | null } | null;
 *   safeBuyerQueue?: import("@/lib/safe-company-approval-queue").SafeCompanyApprovalQueue | null;
 * }} props
 */
export default function PurchaseInvoiceDrawerHeaderMeta({
  t,
  invoiceStatus = null,
  chainIssue = null,
  safeBuyerQueue = null,
}) {
  return (
    <div className="sales-invoice-drawer-header-meta gap-2">
      {invoiceStatus ? (
        <Tag className="m-0" color={purchaseInvoiceStatusTagColor(invoiceStatus)}>
          {getPurchaseInvoiceStatusLabel(t, invoiceStatus)}
        </Tag>
      ) : (
        "\u2014"
      )}
      <SafeConfirmationChip t={t} queue={safeBuyerQueue} />
      <InvoiceChainIssueTag issue={chainIssue} />
    </div>
  );
}
