"use client";

import {
  getPurchaseInvoiceStatusLabel,
  purchaseInvoiceStatusTagColor,
} from "../../utils/purchaseInvoiceStatuses";
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
 * }} props
 */
export default function PurchaseInvoiceDrawerHeaderMeta({ t, invoiceStatus = null }) {
  return (
    <div className="sales-invoice-drawer-header-meta">
      {invoiceStatus ? (
        <Tag className="m-0" color={purchaseInvoiceStatusTagColor(invoiceStatus)}>
          {getPurchaseInvoiceStatusLabel(t, invoiceStatus)}
        </Tag>
      ) : (
        "\u2014"
      )}
    </div>
  );
}
