"use client";

import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { Tag, Typography } from "antd";
import { useTranslations } from "next-intl";

/**
 * Payments recorded for a posted invoice (each one is a receipt). Read-only and compact;
 * new payments are taken in the payment modal (on Post, or "Record payment" afterwards).
 *
 * @param {{
 *   payments?: Array<Record<string, unknown>> | null;
 *   currencySymbol?: string;
 * }} props
 */
export default function SalesInvoicePayments({ payments = null, currencySymbol = "" }) {
  const t = useTranslations("SalesInvoicePayments");
  const list = Array.isArray(payments) ? payments : [];
  if (list.length === 0) return null;
  const money = (value) => formatTenantMoneyWithSymbol(value, currencySymbol) || "—";

  return (
    <section className="mb-4">
      <Typography.Text className="mb-2 block font-medium">{t("title")}</Typography.Text>
      <div className="flex flex-col gap-1 text-sm">
        {list.map((p) => (
          <div key={String(p.id)} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {p.payment_method_name}
              {p.cash_bank_account_name ? ` · ${p.cash_bank_account_name}` : ""}
              {p.reference ? ` · ${p.reference}` : ""}
              {p.receipt_number ? (
                <Tag className="ms-2" color="green">
                  {p.receipt_number}
                </Tag>
              ) : null}
            </span>
            <span className="tabular-nums">
              {money(p.amount)}
              {p.change_due != null && Number(p.change_due) > 0 ? ` (${t("change")} ${money(p.change_due)})` : ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
