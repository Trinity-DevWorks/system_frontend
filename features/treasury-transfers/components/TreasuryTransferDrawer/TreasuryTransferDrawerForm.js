"use client";

import { fetchCashBankAccountNames } from "@/features/cash-bank-accounts/api/cashBankAccounts.api";
import AvailableBalanceHint from "@/features/cash-bank-accounts/components/AvailableBalanceHint";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { DatePicker, Form, Input, InputNumber, Select } from "antd";
import { useMemo } from "react";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function TreasuryTransferDrawerForm({ form, readOnly, t }) {
  const accountsQuery = useQuery({
    queryKey: ["tenant", "cash-bank-accounts", "names"],
    queryFn: () => fetchCashBankAccountNames(),
    staleTime: QUERY_STALE_TIME.catalog,
    // Balances change with every posting; refresh when the form opens.
    refetchOnMount: "always",
  });
  const accounts = useMemo(() => (Array.isArray(accountsQuery.data) ? accountsQuery.data : []), [accountsQuery.data]);
  const options = useMemo(
    () =>
      accounts.map((a) => ({
        value: Number(a.id),
        label: `${a.code} — ${a.name} (${a.currency_code ?? ""})`,
        disabled: a.is_active === false,
      })),
    [accounts],
  );

  const fromId = Form.useWatch("from_account_id", form);
  const toId = Form.useWatch("to_account_id", form);
  const amountFrom = Form.useWatch("amount_from", form);
  const from = accounts.find((a) => Number(a.id) === Number(fromId));
  const to = accounts.find((a) => Number(a.id) === Number(toId));
  const crossCurrency = Boolean(from && to && Number(from.currency_id) !== Number(to.currency_id));

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item name="transfer_date" label={t("fieldDate")} rules={[{ required: true, message: t("fieldDateRequired") }]}>
        <DatePicker className="w-full" />
      </Form.Item>
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <Form.Item
          name="from_account_id"
          label={t("fieldFromAccount")}
          rules={[{ required: true, message: t("fieldAccountRequired") }]}
          extra={readOnly ? null : <AvailableBalanceHint account={from} amount={amountFrom} />}
        >
          <Select showSearch optionFilterProp="label" loading={accountsQuery.isPending} options={options} />
        </Form.Item>
        <Form.Item
          name="to_account_id"
          label={t("fieldToAccount")}
          dependencies={["from_account_id"]}
          rules={[
            { required: true, message: t("fieldAccountRequired") },
            ({ getFieldValue }) => ({
              validator: async (_, value) => {
                if (value != null && String(value) === String(getFieldValue("from_account_id"))) throw new Error(t("fieldSameAccount"));
              },
            }),
          ]}
        >
          <Select showSearch optionFilterProp="label" loading={accountsQuery.isPending} options={options} />
        </Form.Item>
        <Form.Item
          name="amount_from"
          label={from?.currency_code ? `${t("fieldAmountSent")} (${from.currency_code})` : t("fieldAmountSent")}
          rules={[{ required: true, message: t("fieldAmountRequired") }]}
        >
          <InputNumber min={0} className="w-full" />
        </Form.Item>
        {crossCurrency ? (
          <Form.Item
            name="amount_to"
            label={`${t("fieldAmountReceived")} (${to?.currency_code ?? ""})`}
            rules={[{ required: true, message: t("fieldAmountRequired") }]}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        ) : null}
        {crossCurrency ? (
          <>
            <Form.Item name="exchange_rate" label={`${t("fieldRate")} (${from?.currency_code ?? ""})`} extra={t("fieldRateHint")}>
              <InputNumber min={0} className="w-full" stringMode />
            </Form.Item>
            <Form.Item name="exchange_rate_to" label={`${t("fieldRate")} (${to?.currency_code ?? ""})`}>
              <InputNumber min={0} className="w-full" stringMode />
            </Form.Item>
          </>
        ) : null}
      </div>
      <Form.Item name="reference" label={t("fieldReference")} rules={[{ max: 128 }]}>
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="notes" label={t("fieldNotes")}>
        <Input.TextArea rows={3} />
      </Form.Item>
    </Form>
  );
}
