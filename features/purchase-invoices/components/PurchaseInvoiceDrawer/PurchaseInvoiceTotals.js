"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { formatTenantMoney } from "@/lib/tenant-format";
import { Form, Input } from "antd";
import { TamperBesideLabel } from "@/features/sales-invoices/components/InvoiceTamper/InvoiceTamperMark";

/**
 * @param {{
 *   t: (key: string) => string;
 *   readOnly: boolean;
 *   sealLocked?: boolean;
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
export default function PurchaseInvoiceTotals({ t, readOnly, sealLocked = false, totals = null }) {
  const money = (value) => (value != null ? formatTenantMoney(value) : "\u2014");

  return (
    <section className="sales-invoice-totals flex w-full min-w-0 flex-row">
      <div className="sales-invoice-totals-pane min-w-0 flex-1">
        <Form.Item
          name="notes"
          className="sales-invoice-totals-notes"
          label={
            <TamperBesideLabel path="notes">
              <ResourceDrawerFieldLabel text={t("fieldNotes")} optional />
            </TamperBesideLabel>
          }
        >
          <Input.TextArea rows={1} maxLength={2000} showCount={!readOnly && !sealLocked} disabled={readOnly || sealLocked} />
        </Form.Item>
      </div>

      <div className="sales-invoice-totals-pane min-w-0 flex-1">
        <div className="resource-drawer-pricing-summary">
          <div className="resource-drawer-pricing-card">
            <TamperBesideLabel path="subtotal">
              <span className="resource-drawer-pricing-card-label">{t("totalSubtotal")}</span>
            </TamperBesideLabel>
            <span className="resource-drawer-pricing-card-value">{money(totals?.subtotal)}</span>
          </div>
          <div className="resource-drawer-pricing-card">
            <TamperBesideLabel path="grand_total">
              <span className="resource-drawer-pricing-card-label">{t("totalGrand")}</span>
            </TamperBesideLabel>
            <span className="resource-drawer-pricing-card-value">{money(totals?.grand_total)}</span>
          </div>
          <div className="resource-drawer-pricing-card">
            <TamperBesideLabel path="discount_total">
              <span className="resource-drawer-pricing-card-label">{t("totalDiscount")}</span>
            </TamperBesideLabel>
            <span className="resource-drawer-pricing-card-value">{money(totals?.discount_total)}</span>
          </div>
          <div className="resource-drawer-pricing-card">
            <Form.Item
              name="adjustment"
              label={
                <TamperBesideLabel path="adjustment">
                  <ResourceDrawerFieldLabel text={t("totalAdjustment")} />
                </TamperBesideLabel>
              }
              className="mb-0"
              layout="horizontal"
              colon={false}
            >
              <TenantNumberInput kind="money" disabled={readOnly || sealLocked} />
            </Form.Item>
          </div>
          <div className="resource-drawer-pricing-card">
            <TamperBesideLabel path="tax_total">
              <span className="resource-drawer-pricing-card-label">{t("totalTax")}</span>
            </TamperBesideLabel>
            <span className="resource-drawer-pricing-card-value">{money(totals?.tax_total)}</span>
          </div>
          <div className="resource-drawer-pricing-card sales-invoice-totals-net">
            <span className="resource-drawer-pricing-card-label">{t("totalNetToPay")}</span>
            <span className="resource-drawer-pricing-card-value">{money(totals?.net_to_pay)}</span>
          </div>
          <div className="resource-drawer-pricing-card sales-invoice-totals-paid col-start-2">
            <span className="resource-drawer-pricing-card-label">{t("totalPaid")}</span>
            <span className="resource-drawer-pricing-card-value">{money(totals?.paid_total)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
