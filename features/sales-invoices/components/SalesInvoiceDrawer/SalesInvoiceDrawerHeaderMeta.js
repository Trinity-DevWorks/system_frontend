"use client";

import { getSalesInvoiceStatusLabel, salesInvoiceStatusTagColor } from "../../utils/salesInvoiceStatuses";
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
 * }} props
 */
export default function SalesInvoiceDrawerHeaderMeta({
  t,
  invoiceStatus = null,
}) {
  return (
    <div className="sales-invoice-drawer-header-meta">
      {invoiceStatus ? (
        <Tag className="m-0" color={salesInvoiceStatusTagColor(invoiceStatus)}>
          {getSalesInvoiceStatusLabel(t, invoiceStatus)}
        </Tag>
      ) : (
        "\u2014"
      )}
    </div>
  );
}
