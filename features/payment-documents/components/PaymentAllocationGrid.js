"use client";

import { paymentAppliedToInvoice, rateFromPrimary, settlePayment } from "@/lib/currency/documentExchangeRate";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { formatTenantDate, formatTenantMoney } from "@/lib/tenant-format";
import { DeleteOutlined } from "@ant-design/icons";
import { Button, Table, Typography } from "antd";
import { moneyUnits, unitsToAmount } from "../paymentDocumentUtils";

/**
 * @typedef {{
 *   key: string;
 *   invoiceId: string;
 *   invoiceNumber: string;
 *   invoiceDate: string | null;
 *   grandTotal: string | number;
 *   netToPay: string | number;
 *   currencyId?: number | string | null;
 *   currencyCode?: string;
 *   appliedAmount?: number | null;
 *   exchangeDifference?: number | null;
 *   amount: number;
 * }} AllocationRow
 */

/**
 * @param {{
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   readOnly: boolean;
 *   rows: AllocationRow[];
 *   headerAmount: unknown;
 *   receiptCurrencyId?: number | string | null;
 *   receiptRate?: number | null;
 *   primaryCurrencyId?: number | string | null;
 *   pairRates?: Array<{ from_currency_id?: unknown; to_currency_id?: unknown; rate?: unknown }>;
 *   priceDecimals?: number;
 *   currencies?: Array<Record<string, unknown>>;
 *   differenceField?: string;
 *   onAmount: (key: string, amount: number | null) => void;
 *   onApplyRemainder: (key: string) => void;
 *   onRemove: (key: string) => void;
 * }} props
 */
export default function PaymentAllocationGrid({
  t,
  readOnly,
  rows,
  headerAmount,
  receiptCurrencyId = null,
  receiptRate = null,
  primaryCurrencyId = null,
  pairRates = [],
  priceDecimals = 2,
  currencies = [],
  differenceField = "allowed_difference_in_receipt",
  onAmount,
  onApplyRemainder,
  onRemove,
}) {
  const settlementFor = (row) => {
    if (readOnly && row.appliedAmount != null && Number.isFinite(Number(row.appliedAmount))) {
      const stored = Number(row.exchangeDifference ?? 0);
      return {
        applied: Number(row.appliedAmount),
        difference: Number.isFinite(stored) ? stored : 0,
      };
    }
    const same = Number(row.currencyId) === Number(receiptCurrencyId);
    const invoiceRate = same
      ? receiptRate
      : rateFromPrimary(pairRates, primaryCurrencyId, row.currencyId);
    const converted = paymentAppliedToInvoice(row.amount, receiptRate, invoiceRate, same, priceDecimals);
    const invoiceCurrency = currencies.find((currency) => Number(currency.id) === Number(row.currencyId));
    return settlePayment(converted, row.netToPay, invoiceCurrency?.[differenceField], priceDecimals);
  };

  const allocatedUnits = rows.reduce((sum, row) => sum + moneyUnits(row.amount), 0);
  const headerUnits = moneyUnits(headerAmount);
  const remainderUnits = headerUnits - allocatedUnits;

  return (
    <section className="item-lines-panel">
      <Typography.Text strong>{t("allocationsTitle")}</Typography.Text>

      <Table
        size="small"
        pagination={false}
        tableLayout="fixed"
        rowKey="key"
        dataSource={rows}
        locale={{ emptyText: t("allocationsEmpty") }}
        columns={[
          {
            title: t("colInvoice"),
            dataIndex: "invoiceNumber",
            width: 280,
            render: (value) => value || "\u2014",
          },
          {
            title: t("colInvoiceDate"),
            dataIndex: "invoiceDate",
            width: 120,
            render: (value) => formatTenantDate(value) || "\u2014",
          },
          {
            title: t("colInvoiceCurrency"),
            dataIndex: "currencyCode",
            width: 90,
            render: (value) => value || "\u2014",
          },
          {
            title: t("colGrandTotal"),
            dataIndex: "grandTotal",
            width: 130,
            align: "right",
            render: (value) => formatTenantMoney(value) || "\u2014",
          },
          {
            title: t("colNetToPay"),
            dataIndex: "netToPay",
            width: 130,
            align: "right",
            render: (value) => formatTenantMoney(value) || "\u2014",
          },
          {
            title: t("colApplied"),
            key: "applied",
            width: 150,
            align: "right",
            render: (_, row) => {
              const settlement = settlementFor(row);
              if (!Number.isFinite(settlement.applied)) return "\u2014";
              const code = row.currencyCode ? ` ${row.currencyCode}` : "";
              return `${formatTenantMoney(settlement.applied)}${code}`;
            },
          },
          {
            title: t("exchangeDifference"),
            key: "exchangeDifference",
            width: 140,
            align: "right",
            render: (_, row) => {
              const settlement = settlementFor(row);
              if (!Number.isFinite(settlement.difference) || moneyUnits(settlement.difference) === 0) {
                return "\u2014";
              }
              const code = row.currencyCode ? ` ${row.currencyCode}` : "";
              return `${formatTenantMoney(settlement.difference)}${code}`;
            },
          },
          {
            title: t("colApply"),
            dataIndex: "amount",
            width: 220,
            render: (value, row) => (
              <div className="flex items-center gap-2">
                <TenantNumberInput
                  kind="money"
                  className="w-full"
                  min={0}
                  disabled={readOnly}
                  value={value}
                  onChange={(next) => onAmount(row.key, next == null ? 0 : Number(next))}
                />
                {readOnly ? null : (
                  <Button size="small" onClick={() => onApplyRemainder(row.key)}>
                    {t("applyRemainder")}
                  </Button>
                )}
              </div>
            ),
          },
          {
            title: "",
            key: "remove",
            width: 48,
            render: (_, row) =>
              readOnly ? null : (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={t("removeAllocation")}
                  onClick={() => onRemove(row.key)}
                />
              ),
          },
        ]}
      />

      <div className="flex flex-wrap justify-end gap-6 text-sm">
        <span>
          {t("allocatedTotal")}{" "}
          <strong>{formatTenantMoney(unitsToAmount(allocatedUnits))}</strong>
        </span>
        <span>
          {t("unallocatedRemainder")}{" "}
          <strong>{formatTenantMoney(unitsToAmount(remainderUnits))}</strong>
        </span>
      </div>
    </section>
  );
}
