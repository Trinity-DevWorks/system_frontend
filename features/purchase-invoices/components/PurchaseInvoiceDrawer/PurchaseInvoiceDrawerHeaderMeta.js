"use client";

import {
  getPurchaseInvoiceStatusLabel,
  purchaseInvoiceStatusTagColor,
} from "../../utils/purchaseInvoiceStatuses";
import InvoiceChainIssueTag from "@/features/sales-invoices/components/InvoiceChainIssueTag";
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
 *   t: (key: string) => string;
 *   invoiceStatus?: string | null;
 *   chainIssue?: { kind: string; checked_at: string | null } | null;
 * }} props
 */
export default function PurchaseInvoiceDrawerHeaderMeta({ t, invoiceStatus = null, chainIssue = null }) {
  return (
    <div className="sales-invoice-drawer-header-meta gap-2">
      {invoiceStatus ? (
        <Tag className="m-0" color={purchaseInvoiceStatusTagColor(invoiceStatus)}>
          {getPurchaseInvoiceStatusLabel(t, invoiceStatus)}
        </Tag>
      ) : (
        "\u2014"
      )}
      <InvoiceChainIssueTag issue={chainIssue} />
    </div>
  );
}
