"use client";

import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";

/**
 * Purchase order totals footer, same panes as the sales order drawer.
 *
 * @param {{
 *   t: (key: string) => string;
 *   totals?: {
 *     subtotal?: string | number;
 *     discount_total?: string | number;
 *     tax_total?: string | number;
 *     grand_total?: string | number;
 *   } | null;
 *   currencySymbol?: string;
 * }} props
 */
export default function PurchaseOrderTotals({ t, totals = null, currencySymbol = "" }) {
  return (
    <div className="sales-invoice-totals">
      <Summary label={t("poTotalSubtotal")} value={formatTenantMoneyWithSymbol(totals?.subtotal, currencySymbol)} />
      <Summary label={t("poTotalDiscount")} value={formatTenantMoneyWithSymbol(totals?.discount_total, currencySymbol)} />
      <Summary label={t("poTotalTax")} value={formatTenantMoneyWithSymbol(totals?.tax_total, currencySymbol)} />
      <Summary label={t("poTotalGrand")} value={formatTenantMoneyWithSymbol(totals?.grand_total, currencySymbol)} />
    </div>
  );
}

/**
 * @param {{ label: string; value?: string }} props
 */
function Summary({ label, value }) {
  return (
    <div className="sales-invoice-totals-pane">
      <div className="text-xs text-neutral-500">{label}</div>
      <div>{value || "\u2014"}</div>
    </div>
  );
}
