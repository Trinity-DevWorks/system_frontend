"use client";

import { fetchCashBankAccountNames } from "@/features/cash-bank-accounts/api/cashBankAccounts.api";
import AvailableBalanceHint from "@/features/cash-bank-accounts/components/AvailableBalanceHint";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { dayjsDatePattern } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { useQuery } from "@tanstack/react-query";
import { DatePicker, Form, Input, Select } from "antd";
import dayjs from "dayjs";
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
    <Form form={form} layout="vertical" requiredMark={false} disabled={readOnly}>
      <Form.Item
        name="transfer_date"
        label={<ResourceDrawerFieldLabel text={t("fieldDate")} required />}
        rules={[{ required: true, message: t("fieldDateRequired") }]}
        getValueProps={(value) => ({ value: value ? (dayjs.isDayjs(value) ? value : dayjs(value)) : undefined })}
      >
        <DatePicker className="w-full" format={dayjsDatePattern()} />
      </Form.Item>
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <Form.Item
          name="from_account_id"
          label={<ResourceDrawerFieldLabel text={t("fieldFromAccount")} required />}
          rules={[{ required: true, message: t("fieldAccountRequired") }]}
          extra={readOnly ? null : <AvailableBalanceHint account={from} amount={amountFrom} />}
        >
          <Select showSearch optionFilterProp="label" loading={accountsQuery.isPending} options={options} getPopupContainer={drawerSelectGetPopup} />
        </Form.Item>
        <Form.Item
          name="to_account_id"
          label={<ResourceDrawerFieldLabel text={t("fieldToAccount")} required />}
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
          <Select showSearch optionFilterProp="label" loading={accountsQuery.isPending} options={options} getPopupContainer={drawerSelectGetPopup} />
        </Form.Item>
        <Form.Item
          name="amount_from"
          label={<ResourceDrawerFieldLabel text={from?.currency_code ? `${t("fieldAmountSent")} (${from.currency_code})` : t("fieldAmountSent")} required />}
          rules={[{ required: true, message: t("fieldAmountRequired") }]}
        >
          <TenantNumberInput kind="money" min={0} style={{ width: "100%" }} />
        </Form.Item>
        {crossCurrency ? (
          <Form.Item
            name="amount_to"
            label={<ResourceDrawerFieldLabel text={`${t("fieldAmountReceived")} (${to?.currency_code ?? ""})`} required />}
            rules={[{ required: true, message: t("fieldAmountRequired") }]}
          >
            <TenantNumberInput kind="money" min={0} style={{ width: "100%" }} />
          </Form.Item>
        ) : null}
        {crossCurrency ? (
          <>
            <Form.Item name="exchange_rate" label={<ResourceDrawerFieldLabel text={`${t("fieldRate")} (${from?.currency_code ?? ""})`} />} extra={t("fieldRateHint")}>
              <TenantNumberInput kind="rate" min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="exchange_rate_to" label={<ResourceDrawerFieldLabel text={`${t("fieldRate")} (${to?.currency_code ?? ""})`} />}>
              <TenantNumberInput kind="rate" min={0} style={{ width: "100%" }} />
            </Form.Item>
          </>
        ) : null}
      </div>
      <Form.Item name="reference" label={<ResourceDrawerFieldLabel text={t("fieldReference")} />} rules={[{ max: 128 }]}>
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="notes" label={<ResourceDrawerFieldLabel text={t("fieldNotes")} />}>
        <Input.TextArea rows={3} maxLength={2000} showCount={!readOnly} />
      </Form.Item>
    </Form>
  );
}
