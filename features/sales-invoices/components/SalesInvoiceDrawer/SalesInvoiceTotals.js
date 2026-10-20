"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { Form, Input } from "antd";

/**
 * @param {{
 *   t: (key: string) => string;
 *   readOnly: boolean;
 *   totals?: {
 *     subtotal?: string | number;
 *     discount_total?: string | number;
 *     tax_total?: string | number;
 *     grand_total?: string | number;
 *     paid_total?: string | number;
 *     credited_total?: string | number;
 *     net_to_pay?: string | number;
 *   } | null;
 *   currencySymbol?: string;
 * }} props
 */
export default function SalesInvoiceTotals({ t, readOnly, totals = null, currencySymbol = "" }) {
  const money = (value) => (value != null ? formatTenantMoneyWithSymbol(value, currencySymbol) || "\u2014" : "\u2014");

  return (
    <section className="sales-invoice-totals">
      <div className="sales-invoice-totals-pane sales-invoice-totals-notes-pane">
        <Form.Item
          name="notes"
          className="sales-invoice-totals-notes"
          label={<ResourceDrawerFieldLabel text={t("fieldNotes")} optional />}
        >
          <Input.TextArea rows={3} maxLength={2000} showCount={!readOnly} disabled={readOnly} />
        </Form.Item>
      </div>

      <div className="sales-invoice-totals-pane sales-invoice-totals-amounts">
        <div className="sales-invoice-totals-amount-section">
          <AmountRow label={t("totalSubtotal")} value={money(totals?.subtotal)} />
          <AmountRow label={t("totalDiscount")} value={money(totals?.discount_total)} />
          <AmountRow label={t("totalTax")} value={money(totals?.tax_total)} />
        </div>
        <div className="sales-invoice-totals-amount-section">
          <AmountRow label={t("totalGrand")} value={money(totals?.grand_total)} />
          <div className="resource-drawer-pricing-card">
            <Form.Item
              name="adjustment"
              label={<ResourceDrawerFieldLabel text={t("totalAdjustment")} />}
              className="mb-0"
              layout="horizontal"
              colon={false}
            >
              <TenantNumberInput kind="money" disabled={readOnly} addonAfter={currencySymbol || undefined} />
            </Form.Item>
          </div>
          <AmountRow label={t("totalCredited")} value={money(totals?.credited_total)} />
        </div>
        <div className="sales-invoice-totals-amount-section">
          <AmountRow label={t("totalPaid")} value={money(totals?.paid_total)} />
          <AmountRow label={t("totalNetToPay")} value={money(totals?.net_to_pay)} emphasized />
        </div>
      </div>
    </section>
  );
}

/**
 * @param {{ label: string; value: string; emphasized?: boolean }} props
 */
function AmountRow({ label, value, emphasized = false }) {
  return (
    <div className={emphasized ? "resource-drawer-pricing-card sales-invoice-totals-net" : "resource-drawer-pricing-card"}>
      <span className="resource-drawer-pricing-card-label">{label}</span>
      <span className="resource-drawer-pricing-card-value">{value}</span>
    </div>
  );
}
