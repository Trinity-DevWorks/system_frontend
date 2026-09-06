"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { formatTenantMoney } from "@/lib/tenant-format";
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
 *     net_to_pay?: string | number;
 *   } | null;
 * }} props
 */
export default function SalesInvoiceTotals({ t, readOnly, totals = null }) {
  const money = (value) => (value != null ? formatTenantMoney(value) : "\u2014");

  return (
    <section className="sales-invoice-totals flex w-full min-w-0 flex-row">
      <div className="sales-invoice-totals-pane min-w-0 flex-1">
        <Form.Item
          name="notes"
          className="sales-invoice-totals-notes"
          label={<ResourceDrawerFieldLabel text={t("fieldNotes")} optional />}
        >
          <Input.TextArea rows={1} maxLength={2000} showCount={!readOnly} disabled={readOnly} />
        </Form.Item>
      </div>

      <div className="sales-invoice-totals-pane min-w-0 flex-1">
        <div className="resource-drawer-pricing-summary">
          <div className="resource-drawer-pricing-card">
            <span className="resource-drawer-pricing-card-label">{t("totalSubtotal")}</span>
            <span className="resource-drawer-pricing-card-value">{money(totals?.subtotal)}</span>
          </div>
          <div className="resource-drawer-pricing-card">
            <span className="resource-drawer-pricing-card-label">{t("totalGrand")}</span>
            <span className="resource-drawer-pricing-card-value">{money(totals?.grand_total)}</span>
          </div>
          <div className="resource-drawer-pricing-card">
            <span className="resource-drawer-pricing-card-label">{t("totalDiscount")}</span>
            <span className="resource-drawer-pricing-card-value">{money(totals?.discount_total)}</span>
          </div>
          <div className="resource-drawer-pricing-card">
            <Form.Item
              name="adjustment"
              label={<ResourceDrawerFieldLabel text={t("totalAdjustment")} />}
              className="mb-0"
              layout="horizontal"
              colon={false}
            >
              <TenantNumberInput kind="money" disabled={readOnly} />
            </Form.Item>
          </div>
          <div className="resource-drawer-pricing-card">
            <span className="resource-drawer-pricing-card-label">{t("totalTax")}</span>
            <span className="resource-drawer-pricing-card-value">{money(totals?.tax_total)}</span>
          </div>
          <div className="resource-drawer-pricing-card sales-invoice-totals-net">
            <span className="resource-drawer-pricing-card-label">{t("totalNetToPay")}</span>
            <span className="resource-drawer-pricing-card-value">{money(totals?.net_to_pay)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
