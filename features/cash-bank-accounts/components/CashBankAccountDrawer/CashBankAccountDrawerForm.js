"use client";

import { fetchAccounts } from "@/features/accounting/api/accounting.api";
import { fetchCurrencyNames } from "@/features/currencies/index";
import { dayjsDatePattern } from "@/lib/tenant-format";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { DatePicker, Form, Input, Radio, Select, Switch } from "antd";
import { useMemo } from "react";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function CashBankAccountDrawerForm({ form, readOnly, t }) {
  const type = Form.useWatch("type", form);
  const currencyId = Form.useWatch("currency_id", form);
  const currenciesQuery = useQuery({
    queryKey: ["tenant", "currencies"],
    queryFn: () => fetchCurrencyNames(),
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const accountsQuery = useQuery({
    queryKey: ["tenant", "accounts", "postable-assets"],
    queryFn: () => fetchAccounts({ type: "asset", postable: true, active: true }),
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const currencyOptions = useMemo(
    () =>
      (Array.isArray(currenciesQuery.data) ? currenciesQuery.data : []).map((c) => ({
        value: Number(c.id),
        label: [c.code, c.name].filter(Boolean).join(" — "),
      })),
    [currenciesQuery.data],
  );
  const currencyCode = useMemo(() => {
    const list = Array.isArray(currenciesQuery.data) ? currenciesQuery.data : [];
    return list.find((c) => Number(c.id) === Number(currencyId))?.code ?? "";
  }, [currenciesQuery.data, currencyId]);
  const accountOptions = useMemo(
    () =>
      (accountsQuery.data ?? [])
        .filter((a) => a && a.is_group !== true)
        .map((a) => ({ value: Number(a.id), label: [a.code, a.name].filter(Boolean).join(" — ") })),
    [accountsQuery.data],
  );

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item name="type" label={t("fieldType")}>
        <Radio.Group
          optionType="button"
          options={[
            { value: "cash", label: t("typeCash") },
            { value: "bank", label: t("typeBank") },
          ]}
        />
      </Form.Item>
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
        <Form.Item
          name="code"
          label={t("fieldCode")}
          rules={[
            { required: true, message: t("fieldCodeRequired") },
            { max: 50, message: t("fieldCodeMax") },
            { pattern: /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, message: t("fieldCodePattern") },
          ]}
        >
          <Input autoComplete="off" placeholder={t("fieldCodePlaceholder")} />
        </Form.Item>
        <Form.Item name="name" label={t("fieldName")} rules={[{ required: true, message: t("fieldNameRequired") }, { max: 255, message: t("fieldNameMax") }]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="currency_id" label={t("fieldCurrency")} rules={[{ required: true, message: t("fieldCurrencyRequired") }]}>
          <Select showSearch optionFilterProp="label" loading={currenciesQuery.isPending} options={currencyOptions} />
        </Form.Item>
      </div>
      <Form.Item
        name="account_id"
        label={t("fieldLedgerAccount")}
        extra={t("fieldLedgerAccountHint")}
        rules={[{ required: true, message: t("fieldLedgerAccountRequired") }]}
      >
        <Select showSearch optionFilterProp="label" loading={accountsQuery.isPending} options={accountOptions} />
      </Form.Item>
      <div className="grid grid-cols-1 gap-x-2 md:grid-cols-[2fr_3fr]">
        <Form.Item name="opening_balance" label={t("fieldOpeningBalance")}>
          <TenantNumberInput kind="money" min={0} style={{ width: "100%" }} placeholder="0" suffix={currencyCode || undefined} />
        </Form.Item>
        <Form.Item
          name="opening_date"
          label={t("fieldOpeningDate")}
          dependencies={["opening_balance"]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                const amount = Number(getFieldValue("opening_balance") ?? 0);
                if (!Number.isFinite(amount) || amount <= 0 || value) return Promise.resolve();
                return Promise.reject(new Error(t("fieldOpeningDateRequired")));
              },
            }),
          ]}
        >
          <DatePicker className="w-full" format={dayjsDatePattern()} />
        </Form.Item>
      </div>
      {type === "bank" ? (
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
          <Form.Item name="bank_name" label={t("fieldBankName")}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="account_number" label={t("fieldAccountNumber")}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="iban" label={t("fieldIban")}>
            <Input autoComplete="off" />
          </Form.Item>
        </div>
      ) : null}
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
    </Form>
  );
}
