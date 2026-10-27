"use client";

import { formatTenantMoney } from "@/lib/tenant-format";

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
 * }} props
 */
export default function PurchaseOrderTotals({ t, totals = null }) {
  return (
    <div className="sales-invoice-totals">
      <Summary label={t("poTotalSubtotal")} value={formatTenantMoney(totals?.subtotal)} />
      <Summary label={t("poTotalDiscount")} value={formatTenantMoney(totals?.discount_total)} />
      <Summary label={t("poTotalTax")} value={formatTenantMoney(totals?.tax_total)} />
      <Summary label={t("poTotalGrand")} value={formatTenantMoney(totals?.grand_total)} />
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
