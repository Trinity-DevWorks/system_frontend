"use client";

/**
 * "Available: 1,250.00 USD" under a cash/bank account select, plus a warning when the
 * amount is more than that. Cash cannot be posted (red); bank only goes into overdraft (orange).
 *
 * Used by:
 * - treasury-transfers/.../TreasuryTransferDrawerForm.js
 * - expense-vouchers/.../ExpenseVoucherDrawerForm.js
 */

import { formatTenantMoney } from "@/lib/tenant-format";
import { Typography } from "antd";
import { useTranslations } from "next-intl";

/**
 * @param {{
 *   account: { type?: string, balance?: string | number, currency_code?: string } | null | undefined,
 *   amount?: number | string | null,
 * }} props
 */
export default function AvailableBalanceHint({ account, amount }) {
  const t = useTranslations("CashBankAccounts");
  if (!account) return null;

  const available = Number(account.balance ?? 0) || 0;
  const wanted = Number(amount ?? 0) || 0;
  const short = wanted > 0 && wanted - available > 1e-9;
  const isCash = account.type !== "bank";

  return (
    <span className="flex flex-col">
      <span>
        {t("availableBalance", { amount: `${formatTenantMoney(available)} ${account.currency_code ?? ""}`.trim() })}
      </span>
      {short ? (
        <Typography.Text type={isCash ? "danger" : "warning"}>
          {isCash ? t("insufficientCash") : t("overdraftWarning")}
        </Typography.Text>
      ) : null}
    </span>
  );
}
