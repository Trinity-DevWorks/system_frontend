"use client";

import { fetchAccounts } from "@/features/accounting/api/accounting.api";
import { fetchCashBankAccountNames } from "@/features/cash-bank-accounts/api/cashBankAccounts.api";
import AvailableBalanceHint from "@/features/cash-bank-accounts/components/AvailableBalanceHint";
import { fetchVatGroupNames } from "@/features/vat-groups/index";
import { formatTenantMoney } from "@/lib/tenant-format";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, DatePicker, Divider, Form, Input, InputNumber, Select, Typography } from "antd";
import { useMemo } from "react";

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
  const expenseAccountsQuery = useQuery({
    queryKey: ["tenant", "accounts", "postable-expenses"],
    queryFn: () => fetchAccounts({ type: "expense", postable: true, active: true }),
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
  const expenseOptions = useMemo(
    () =>
      (expenseAccountsQuery.data ?? [])
        .filter((a) => a && a.is_group !== true)
        .map((a) => ({ value: Number(a.id), label: [a.code, a.name].filter(Boolean).join(" — ") })),
    [expenseAccountsQuery.data],
  );
  const vatGroups = useMemo(() => (Array.isArray(vatQuery.data) ? vatQuery.data : []), [vatQuery.data]);
  const vatOptions = useMemo(
    () => vatGroups.map((v) => ({ value: Number(v.id), label: `${v.name ?? v.abrv} (${Number(v.percentage ?? 0)}%)` })),
    [vatGroups],
  );

  const linesWatch = Form.useWatch("lines", form);
  const cashId = Form.useWatch("cash_bank_account_id", form);
  const cashAccount = cashAccounts.find((a) => Number(a.id) === Number(cashId));
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
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <Form.Item name="voucher_date" label={t("fieldDate")} rules={[{ required: true, message: t("fieldDateRequired") }]}>
          <DatePicker className="w-full" />
        </Form.Item>
        <Form.Item
          name="cash_bank_account_id"
          label={t("fieldPaidFrom")}
          rules={[{ required: true, message: t("fieldAccountRequired") }]}
          extra={readOnly ? null : <AvailableBalanceHint account={cashAccount} amount={totals.total} />}
        >
          <Select showSearch optionFilterProp="label" loading={cashQuery.isPending} options={cashOptions} />
        </Form.Item>
        <Form.Item name="payee" label={t("fieldPayee")} rules={[{ max: 255 }]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="reference" label={t("fieldReference")} rules={[{ max: 128 }]}>
          <Input autoComplete="off" />
        </Form.Item>
      </div>

      <Divider titlePlacement="start" className="!mt-2">
        {t("sectionLines")}
      </Divider>
      <Form.List name="lines">
        {(fields, { add, remove }) => (
          <div className="flex flex-col gap-2">
            {fields.map(({ key, name, ...rest }) => (
              <div
                key={key}
                className="grid grid-cols-1 items-start gap-2 rounded-md border border-neutral-200 p-2 md:grid-cols-[minmax(0,2.4fr)_minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_32px] md:border-0 md:p-0 dark:border-neutral-700"
              >
                <Form.Item {...rest} name={[name, "account_id"]} className="mb-0" rules={[{ required: true, message: t("fieldExpenseAccountRequired") }]}>
                  <Select showSearch optionFilterProp="label" loading={expenseAccountsQuery.isPending} options={expenseOptions} placeholder={t("colExpenseAccount")} />
                </Form.Item>
                <Form.Item {...rest} name={[name, "description"]} className="mb-0">
                  <Input placeholder={t("colDescription")} />
                </Form.Item>
                <Form.Item {...rest} name={[name, "amount"]} className="mb-0" rules={[{ required: true, message: t("fieldAmountRequired") }]}>
                  <InputNumber min={0} className="w-full" placeholder={t("colAmount")} />
                </Form.Item>
                <Form.Item {...rest} name={[name, "vat_group_id"]} className="mb-0">
                  <Select allowClear options={vatOptions} placeholder={t("colVat")} />
                </Form.Item>
                {!readOnly ? (
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label={t("actionDelete")} onClick={() => remove(name)} disabled={fields.length <= 1} />
                ) : (
                  <span />
                )}
              </div>
            ))}
            {!readOnly ? (
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ account_id: undefined, description: "", amount: null, vat_group_id: undefined })} block>
                {t("addLine")}
              </Button>
            ) : null}
          </div>
        )}
      </Form.List>

      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <Typography.Text>
          {t("subtotal")}: {formatTenantMoney(totals.subtotal)}
        </Typography.Text>
        <Typography.Text>
          {t("taxTotal")}: {formatTenantMoney(totals.tax)}
        </Typography.Text>
        <Typography.Text strong>
          {t("total")}: {formatTenantMoney(totals.total)}
        </Typography.Text>
      </div>

      <Form.Item name="notes" label={t("fieldNotes")} className="mt-4">
        <Input.TextArea rows={3} />
      </Form.Item>
    </Form>
  );
}
