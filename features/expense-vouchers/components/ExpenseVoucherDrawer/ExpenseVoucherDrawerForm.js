"use client";

import { fetchAccounts } from "@/features/accounting/api/accounting.api";
import { fetchExpenseVoucherDeferralDefaults } from "@/features/expense-vouchers/api/expenseVouchers.api";
import { fetchCashBankAccountNames } from "@/features/cash-bank-accounts/api/cashBankAccounts.api";
import AvailableBalanceHint from "@/features/cash-bank-accounts/components/AvailableBalanceHint";
import { fetchVatGroupNames } from "@/features/vat-groups/index";
import { dayjsDatePattern, formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { DatePicker, Form, Input, Select, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";
import ExpenseVoucherLineEditor from "./ExpenseVoucherLineEditor";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function ExpenseVoucherDrawerForm({ form, readOnly, t }) {
  const cashQuery = useQuery({
    queryKey: ["tenant", "cash-bank-accounts", "names"],
    queryFn: () => fetchCashBankAccountNames(),
    staleTime: QUERY_STALE_TIME.catalog,
    // Balances change with every posting; refresh when the form opens.
    refetchOnMount: "always",
  });
  const deferralDefaultsQuery = useQuery({
    queryKey: ["tenant", "expense-vouchers", "deferral-defaults"],
    queryFn: fetchExpenseVoucherDeferralDefaults,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const assetAccountsQuery = useQuery({
    queryKey: ["tenant", "accounts", "postable-assets"],
    queryFn: () => fetchAccounts({ type: "asset", postable: true, active: true }),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const expenseAccountsQuery = useQuery({
    queryKey: ["tenant", "accounts", "postable-expenses"],
    queryFn: () => fetchAccounts({ type: "expense", postable: true, active: true }),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  // Freight / customs paid in cash can go to the landed cost clearing account (spread later by a landed cost).
  const clearingQuery = useQuery({
    queryKey: ["tenant", "accounts", "postable-liabilities"],
    queryFn: () => fetchAccounts({ type: "liability", postable: true, active: true }),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const vatQuery = useQuery({
    queryKey: ["tenant", "vat-groups"],
    queryFn: () => fetchVatGroupNames(),
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const cashAccounts = useMemo(() => (Array.isArray(cashQuery.data) ? cashQuery.data : []), [cashQuery.data]);
  const cashOptions = useMemo(
    () => cashAccounts.map((a) => ({ value: Number(a.id), label: `${a.code} — ${a.name} (${a.currency_code ?? ""})`, disabled: a.is_active === false })),
    [cashAccounts],
  );
  const assetOptions = useMemo(
    () => (assetAccountsQuery.data ?? []).filter((a) => a && a.is_group !== true).map((a) => ({ value: Number(a.id), label: [a.code, a.name].filter(Boolean).join(" — ") })),
    [assetAccountsQuery.data],
  );
  const expenseOptions = useMemo(
    () =>
      (expenseAccountsQuery.data ?? [])
        .filter((a) => a && a.is_group !== true)
        .map((a) => ({ value: Number(a.id), label: [a.code, a.name].filter(Boolean).join(" — ") }))
        .concat(
          (clearingQuery.data ?? [])
            .filter((a) => a && Array.isArray(a.roles) && a.roles.includes("landed_cost_clearing"))
            .map((a) => ({ value: Number(a.id), label: `${[a.code, a.name].filter(Boolean).join(" — ")} (${t("landedCostClearing")})` })),
        ),
    [expenseAccountsQuery.data, clearingQuery.data, t],
  );
  const vatGroups = useMemo(() => (Array.isArray(vatQuery.data) ? vatQuery.data : []), [vatQuery.data]);
  const vatOptions = useMemo(
    () => vatGroups.map((v) => ({ value: Number(v.id), label: `${v.name ?? v.abrv} (${Number(v.percentage ?? 0)}%)` })),
    [vatGroups],
  );

  const linesWatch = Form.useWatch("lines", { form, preserve: true });
  const cashId = Form.useWatch("cash_bank_account_id", form);
  const cashAccount = cashAccounts.find((a) => Number(a.id) === Number(cashId));
  // The voucher is paid in the paid-from account's currency.
  const currencyMark = String(cashAccount?.currency_symbol || cashAccount?.currency_code || "").trim();
  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const line of Array.isArray(linesWatch) ? linesWatch : []) {
      const amount = Number(line?.amount) || 0;
      const vat = vatGroups.find((v) => Number(v.id) === Number(line?.vat_group_id));
      subtotal += amount;
      tax += vat ? (amount * Number(vat.percentage ?? 0)) / 100 : 0;
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [linesWatch, vatGroups]);

  return (
    <Form form={form} layout="vertical" requiredMark={false} disabled={readOnly}>
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <Form.Item
          name="voucher_date"
          label={<ResourceDrawerFieldLabel text={t("fieldDate")} required />}
          rules={[{ required: true, message: t("fieldDateRequired") }]}
          getValueProps={(value) => ({ value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined })}
        >
          <DatePicker className="w-full" format={dayjsDatePattern()} />
        </Form.Item>
        <Form.Item name="reference" label={<ResourceDrawerFieldLabel text={t("fieldReference")} />} rules={[{ max: 128 }]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="cash_bank_account_id"
          label={<ResourceDrawerFieldLabel text={t("fieldPaidFrom")} required />}
          rules={[{ required: true, message: t("fieldAccountRequired") }]}
          extra={readOnly ? null : <AvailableBalanceHint account={cashAccount} amount={totals.total} />}
        >
          <Select showSearch optionFilterProp="label" loading={cashQuery.isPending} options={cashOptions} getPopupContainer={drawerSelectGetPopup} />
        </Form.Item>
        <Form.Item name="payee" label={<ResourceDrawerFieldLabel text={t("fieldPayee")} />} rules={[{ max: 255 }]}>
          <Input autoComplete="off" />
        </Form.Item>
      </div>

      <ExpenseVoucherLineEditor
        form={form}
        readOnly={readOnly}
        t={t}
        expenseOptions={expenseOptions}
        assetOptions={assetOptions}
        prepaidAccountId={deferralDefaultsQuery.data?.prepaid_expense?.id ?? null}
        expenseAccountsPending={expenseAccountsQuery.isPending}
        vatOptions={vatOptions}
        currencyMark={currencyMark}
      />

      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <Typography.Text>
          {t("subtotal")}: {formatTenantMoneyWithSymbol(totals.subtotal, currencyMark)}
        </Typography.Text>
        <Typography.Text>
          {t("taxTotal")}: {formatTenantMoneyWithSymbol(totals.tax, currencyMark)}
        </Typography.Text>
        <Typography.Text strong>
          {t("total")}: {formatTenantMoneyWithSymbol(totals.total, currencyMark)}
        </Typography.Text>
      </div>

      <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("fieldNotes")} />} className="mt-4">
        <Input.TextArea rows={3} maxLength={2000} showCount={!readOnly} />
      </Form.Item>
    </Form>
  );
}
