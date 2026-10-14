"use client";

import { salesInvoiceStatusTag } from "../../utils/salesInvoiceStatuses";
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
 *   t: (key: string) => string;
 *   invoiceStatus?: string | null;
 *   paidTotal?: unknown;
 *   netToPay?: unknown;
 * }} props
 */
export default function SalesInvoiceDrawerHeaderMeta({
  t,
  invoiceStatus = null,
  paidTotal,
  netToPay,
}) {
  const tag = invoiceStatus ? salesInvoiceStatusTag(t, invoiceStatus, paidTotal, netToPay) : null;
  return (
    <div className="sales-invoice-drawer-header-meta">
      {tag ? (
        <Tag className="m-0" color={tag.color}>
          {tag.label}
        </Tag>
      ) : (
        "\u2014"
      )}
    </div>
  );
}
