"use client";

import { formatTenantDate, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { Button, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";

/**
 * Payments of a posted invoice. Those taken with the sale live on the invoice itself (no receipt);
 * payments recorded later link to their receipt. Read-only; new payments are taken in the payment modal.
 *
 * @param {{
 *   payments?: Array<Record<string, unknown>> | null;
 *   currencySymbol?: string;
 *   invoiceCurrencyId?: number | null;
 *   extraCredit?: unknown;
 *   extraCreditUsed?: unknown;
 *   onOpenReceipt?: ((id: string) => void) | null;
 * }} props
 */
export default function SalesInvoicePayments({
  payments = null,
  currencySymbol = "",
  invoiceCurrencyId = null,
  extraCredit = 0,
  extraCreditUsed = 0,
  onOpenReceipt = null,
}) {
  const t = useTranslations("SalesInvoicePayments");
  const list = Array.isArray(payments) ? payments : [];
  const kept = Number(extraCredit) || 0;
  if (list.length === 0 && kept <= 0) return null;
  const money = (value) => formatTenantMoneyWithSymbol(value, currencySymbol) || "—";
  const ownAmount = (p) => {
    // Credit rows show what is still applied (credit taken back when its source was reversed).
    if (p.kind === "credit") return money(p.applied_amount ?? p.amount);
    const foreign = p.currency_id != null && invoiceCurrencyId != null && Number(p.currency_id) !== Number(invoiceCurrencyId);
    return foreign ? `${formatTenantMoneyWithSymbol(p.amount, "")} ${p.currency_code ?? ""}`.trim() : money(p.amount);
  };

  return (
    <section className="mb-4">
      <Typography.Text className="mb-2 block font-medium">{t("title")}</Typography.Text>
      <div className="flex flex-col gap-1 text-sm">
        {list.map((p) => {
          const isCredit = p.kind === "credit";
          return (
            <div key={String(p.id)} className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex flex-wrap items-center gap-x-1">
                {isCredit ? t("customerCredit") : p.payment_method_name}
                {!isCredit && p.cash_bank_account_name ? ` · ${p.cash_bank_account_name}` : ""}
                {p.cheque_number ? ` · ${p.cheque_number}` : p.reference ? ` · ${p.reference}` : ""}
                {p.receipt_number ? (
                  onOpenReceipt && p.customer_receipt_id ? (
                    <Button
                      type="link"
                      size="small"
                      className="px-1"
                      onClick={() => onOpenReceipt(String(p.customer_receipt_id))}
                    >
                      {t("paidLater", { number: String(p.receipt_number) })}
                    </Button>
                  ) : (
                    <Tag className="ms-1">{t("paidLater", { number: String(p.receipt_number) })}</Tag>
                  )
                ) : null}
                {p.bounced_on ? (
                  <Tag color="red" className="ms-1">
                    {t("bounced", { date: formatTenantDate(p.bounced_on) })}
                  </Tag>
                ) : null}
                {p.extra_credit != null && Number(p.extra_credit) > 0 ? (
                  <Tag color="blue" className="ms-1">
                    {t("keptAsCreditAmount", { amount: money(p.extra_credit) })}
                  </Tag>
                ) : null}
              </span>
              <span className="tabular-nums">
                {ownAmount(p)}
                {p.change_due != null && Number(p.change_due) > 0 ? ` (${t("change")} ${money(p.change_due)})` : ""}
              </span>
            </div>
          );
        })}
        {kept > 0 ? (
          <Typography.Text type="secondary" className="text-xs">
            {t("creditLeft", { amount: money(kept), used: money(extraCreditUsed) })}
          </Typography.Text>
        ) : null}
      </div>
    </section>
  );
}
