"use client";

import LookupSelectWithCreate from "@/components/resource-drawer/LookupSelectWithCreate";
import { dayjsDatePattern } from "@/lib/tenant-format";
import dayjs from "dayjs";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, DatePicker, Divider, Form, Input, InputNumber, Select, Space, Switch, Typography } from "antd";
import {
  SUPPLIER_LOOKUP_ADD_PAYMENT_METHOD,
  SUPPLIER_LOOKUP_ADD_PAYMENT_TERMS,
  SUPPLIER_LOOKUP_ADD_SUPPLIER_GROUP,
  SUPPLIER_LOOKUP_ADD_VAT_GROUP,
} from "./supplierDrawerUtils";

const PHONE_MAX = 32;

/**
 * @param {unknown[]} currencies
 * @param {unknown[]} currentRows
 * @param {number} currentRowIndex
 * @param {(key: string) => string} t
 */
function currencyOptionsForRow(currencies, currentRows, currentRowIndex, t) {
  const rows = Array.isArray(currentRows) ? currentRows : [];
  const taken = new Set(
    rows
      .map((r, i) => (i === currentRowIndex ? null : r?.currency_id))
      .filter((id) => id != null && id !== ""),
  );
  const list = Array.isArray(currencies) ? currencies : [];
  return list
    .filter((c) => c && c.active !== false)
    .map((c) => ({
      value: c.id,
      label: `${c.code ?? c.id}${c.is_primary ? ` (${t("fieldCurrencyPrimaryMark")})` : ""} — ${c.name ?? ""}`,
      disabled: taken.has(c.id),
    }));
}

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   mode: "create" | "edit" | "view";
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   supplierGroupOptions: { value: unknown; label: string }[];
 *   supplierGroupsPending: boolean;
 *   onOpenSupplierGroupDrawer?: () => void;
 *   paymentMethodOptions: { value: unknown; label: string }[];
 *   paymentMethodsPending: boolean;
 *   onOpenPaymentMethodDrawer?: () => void;
 *   paymentTermOptions: { value: unknown; label: string }[];
 *   paymentTermsPending: boolean;
 *   onOpenPaymentTermsDrawer?: () => void;
 *   vatGroupOptions: { value: unknown; label: string }[];
 *   vatGroupsPending: boolean;
 *   onOpenVatGroupDrawer?: () => void;
 *   currencies: unknown[];
 *   currenciesPending: boolean;
 * }} props
 */
export default function SupplierDrawerForm({
  form,
  mode,
  readOnly,
  t,
  supplierGroupOptions,
  supplierGroupsPending,
  onOpenSupplierGroupDrawer,
  paymentMethodOptions,
  paymentMethodsPending,
  onOpenPaymentMethodDrawer,
  paymentTermOptions,
  paymentTermsPending,
  onOpenPaymentTermsDrawer,
  vatGroupOptions,
  vatGroupsPending,
  onOpenVatGroupDrawer,
  currencies,
  currenciesPending,
}) {
  const showCode = mode !== "create";
  const creditRowsWatch = Form.useWatch("currency_credit_limits", form);
  const openingRowsWatch = Form.useWatch("currency_opening_balances", form);

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={readOnly ? false : "optional"}
      disabled={readOnly}
      onValuesChange={(changed) => {
        if (Object.prototype.hasOwnProperty.call(changed, "is_vat_registered") && changed.is_vat_registered === false) {
          form.setFieldValue("vat_number", "");
        }
        if (Object.prototype.hasOwnProperty.call(changed, "is_exempted") && changed.is_exempted === false) {
          form.setFieldsValue({
            exemption_reason: "",
            exempted_from: undefined,
            exempted_to: undefined,
          });
        }
      }}
    >
      {showCode ? (
        <Form.Item name="supplier_code" label={t("fieldSupplierCode")}>
          <Input readOnly disabled className="font-mono text-xs" />
        </Form.Item>
      ) : null}

      <Form.Item
        name="name"
        label={t("fieldName")}
        rules={[
          { required: true, message: t("fieldNameRequired") },
          { max: 255, message: t("fieldNameMax") },
        ]}
      >
        <Input placeholder={t("fieldNamePlaceholder")} allowClear />
      </Form.Item>

      <Form.Item
        name="email"
        label={t("fieldEmail")}
        rules={[
          {
            validator: async (_, value) => {
              const v = String(value ?? "").trim();
              if (!v) return;
              if (v.length > 255) throw new Error(t("fieldEmailMax"));
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(t("fieldEmailInvalid"));
            },
          },
        ]}
      >
        <Input type="email" placeholder={t("fieldEmailPlaceholder")} allowClear />
      </Form.Item>

      <Form.Item
        name="phone"
        label={t("fieldPhone")}
        rules={[{ max: PHONE_MAX, message: t("fieldPhoneMax") }]}
      >
        <Input placeholder={t("fieldPhonePlaceholder")} allowClear />
      </Form.Item>

      <LookupSelectWithCreate
        form={form}
        name="supplier_group_id"
        label={t("fieldSupplierGroup")}
        readOnly={readOnly}
        addNewSentinel={SUPPLIER_LOOKUP_ADD_SUPPLIER_GROUP}
        addNewLabel={t("fieldSupplierGroupAddNew")}
        onAddNew={onOpenSupplierGroupDrawer}
        options={supplierGroupOptions}
        loading={supplierGroupsPending}
        placeholder={t("fieldSupplierGroupPlaceholder")}
      />

      <Divider titlePlacement="start" className="!mt-6">
        {t("drawerSectionCommercial")}
      </Divider>

      <Form.Item name="company_name" label={t("fieldCompanyName")} rules={[{ max: 255, message: t("fieldNameMax") }]}>
        <Input placeholder={t("fieldCompanyNamePlaceholder")} allowClear />
      </Form.Item>

      <LookupSelectWithCreate
        form={form}
        name="payment_method_id"
        label={t("fieldPaymentMethod")}
        readOnly={readOnly}
        addNewSentinel={SUPPLIER_LOOKUP_ADD_PAYMENT_METHOD}
        addNewLabel={t("fieldPaymentMethodAddNew")}
        onAddNew={onOpenPaymentMethodDrawer}
        options={paymentMethodOptions}
        loading={paymentMethodsPending}
        placeholder={t("fieldPaymentMethodPlaceholder")}
      />

      <LookupSelectWithCreate
        form={form}
        name="payment_terms_id"
        label={t("fieldPaymentTerms")}
        readOnly={readOnly}
        addNewSentinel={SUPPLIER_LOOKUP_ADD_PAYMENT_TERMS}
        addNewLabel={t("fieldPaymentTermsAddNew")}
        onAddNew={onOpenPaymentTermsDrawer}
        options={paymentTermOptions}
        loading={paymentTermsPending}
        placeholder={t("fieldPaymentTermsPlaceholder")}
      />

      <LookupSelectWithCreate
        form={form}
        name="vat_group_id"
        label={t("fieldVatGroup")}
        readOnly={readOnly}
        addNewSentinel={SUPPLIER_LOOKUP_ADD_VAT_GROUP}
        addNewLabel={t("fieldVatGroupAddNew")}
        onAddNew={onOpenVatGroupDrawer}
        options={vatGroupOptions}
        loading={vatGroupsPending}
        placeholder={t("fieldVatGroupPlaceholder")}
      />

      <Divider titlePlacement="start" className="!mt-6">
        {t("drawerSectionAccount")}
      </Divider>

      <Form.Item name="is_active" label={t("fieldIsActive")} valuePropName="checked">
        <Switch />
      </Form.Item>

      <Divider titlePlacement="start" className="!mt-6">
        {t("drawerSectionBalances")}
      </Divider>

      <Typography.Text className="mb-1 block font-medium">{t("drawerSectionCreditLimits")}</Typography.Text>
      <Typography.Text type="secondary" className="mb-3 block text-sm">
        {t("fieldCreditLimitsHint")}
      </Typography.Text>
      <Form.List
        name="currency_credit_limits"
        rules={[
          {
            validator: async (_, value) => {
              const rows = Array.isArray(value) ? value : [];
              const ids = rows.map((r) => r?.currency_id).filter((id) => id != null && id !== "");
              if (ids.length !== new Set(ids).size) {
                throw new Error(t("fieldCurrencyDuplicate"));
              }
            },
          },
        ]}
      >
        {(fields, { add, remove }) => (
          <div className="flex flex-col gap-3">
            {fields.map((field) => {
              const { key, name, ...restField } = field;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40"
                >
                  <Space wrap className="w-full" align="start">
                    <Form.Item
                      {...restField}
                      name={[name, "currency_id"]}
                      label={t("fieldCurrency")}
                      rules={[{ required: true, message: t("fieldCurrencyRequired") }]}
                      className="mb-0 min-w-[200px] flex-1"
                    >
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        loading={currenciesPending}
                        placeholder={t("fieldCurrencyPlaceholder")}
                        options={currencyOptionsForRow(currencies, creditRowsWatch, name, t)}
                        labelRender={({ label }) => label}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "credit_limit"]}
                      label={t("fieldCreditLimit")}
                      rules={[
                        {
                          type: "number",
                          min: 0,
                          message: t("fieldCreditLimitMin"),
                        },
                      ]}
                      className="mb-0 min-w-[160px]"
                    >
                      <InputNumber className="w-full" min={0} step={0.0001} precision={4} placeholder="0" />
                    </Form.Item>
                    {!readOnly ? (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        className="mt-1 shrink-0"
                        onClick={() => remove(name)}
                        aria-label={t("fieldCurrencyRemove")}
                      />
                    ) : null}
                  </Space>
                </div>
              );
            })}
            {!readOnly ? (
              <Button type="dashed" onClick={() => add({ credit_limit: 0 })} block icon={<PlusOutlined />}>
                {t("fieldCurrencyAddCredit")}
              </Button>
            ) : null}
          </div>
        )}
      </Form.List>

      <Typography.Text className="mb-1 mt-8 block font-medium">{t("drawerSectionOpeningBalances")}</Typography.Text>
      <Typography.Text type="secondary" className="mb-3 block text-sm">
        {t("fieldOpeningBalancesHint")}
      </Typography.Text>
      <Form.List
        name="currency_opening_balances"
        rules={[
          {
            validator: async (_, value) => {
              const rows = Array.isArray(value) ? value : [];
              const ids = rows.map((r) => r?.currency_id).filter((id) => id != null && id !== "");
              if (ids.length !== new Set(ids).size) {
                throw new Error(t("fieldCurrencyDuplicate"));
              }
            },
          },
        ]}
      >
        {(fields, { add, remove }) => (
          <div className="flex flex-col gap-3">
            {fields.map((field) => {
              const { key, name, ...restField } = field;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40"
                >
                  <Space wrap className="w-full" align="start">
                    <Form.Item
                      {...restField}
                      name={[name, "currency_id"]}
                      label={t("fieldCurrency")}
                      rules={[{ required: true, message: t("fieldCurrencyRequired") }]}
                      className="mb-0 min-w-[200px] flex-1"
                    >
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        loading={currenciesPending}
                        placeholder={t("fieldCurrencyPlaceholder")}
                        options={currencyOptionsForRow(currencies, openingRowsWatch, name, t)}
                        labelRender={({ label }) => label}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "opening_balance"]}
                      label={t("fieldOpeningBalance")}
                      className="mb-0 min-w-[140px]"
                    >
                      <InputNumber className="w-full" step={0.0001} precision={4} placeholder="0" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "opening_date"]}
                      label={t("fieldOpeningDate")}
                      className="mb-0 min-w-[160px]"
                      dependencies={[["currency_opening_balances", name, "opening_balance"]]}
                      rules={[
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            const bal = getFieldValue(["currency_opening_balances", name, "opening_balance"]);
                            const n = Number(bal ?? 0);
                            if (!Number.isFinite(n) || Math.abs(n) < 1e-9) return Promise.resolve();
                            if (value) return Promise.resolve();
                            return Promise.reject(new Error(t("fieldOpeningDateRequired")));
                          },
                        }),
                      ]}
                    >
                      <DatePicker className="w-full" format={dayjsDatePattern()} />
                    </Form.Item>
                    {mode !== "create" ? (
                      <Form.Item
                        {...restField}
                        name={[name, "ledger_balance"]}
                        label={t("fieldLedgerBalance")}
                        className="mb-0 min-w-[120px]"
                      >
                        <InputNumber className="w-full" disabled readOnly step={0.0001} precision={4} />
                      </Form.Item>
                    ) : null}
                    {!readOnly ? (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        className="mt-1 shrink-0"
                        onClick={() => remove(name)}
                        aria-label={t("fieldCurrencyRemove")}
                      />
                    ) : null}
                  </Space>
                </div>
              );
            })}
            {!readOnly ? (
              <Button
                type="dashed"
                onClick={() => add({ opening_balance: 0, opening_date: dayjs() })}
                block
                icon={<PlusOutlined />}
              >
                {t("fieldCurrencyAddOpening")}
              </Button>
            ) : null}
          </div>
        )}
      </Form.List>

      <Divider titlePlacement="start" className="!mt-6">
        {t("drawerSectionTax")}
      </Divider>

      <Form.Item name="is_vat_registered" label={t("fieldIsVatRegistered")} valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prev, cur) => prev.is_vat_registered !== cur.is_vat_registered}
      >
        {({ getFieldValue }) =>
          getFieldValue("is_vat_registered") ? (
            <Form.Item
              name="vat_number"
              label={t("fieldVatNumber")}
              rules={[
                { required: true, message: t("fieldVatNumberRequired") },
                { max: 128, message: t("fieldVatNumberMax") },
              ]}
            >
              <Input placeholder={t("fieldVatNumberPlaceholder")} allowClear />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      <Form.Item name="is_exempted" label={t("fieldIsExempted")} valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.is_exempted !== cur.is_exempted}>
        {({ getFieldValue }) =>
          getFieldValue("is_exempted") ? (
            <>
              <Form.Item
                name="exemption_reason"
                label={t("fieldExemptionReason")}
                rules={[{ required: true, message: t("fieldExemptionReasonRequired") }]}
              >
                <Input.TextArea rows={2} placeholder={t("fieldExemptionReasonPlaceholder")} allowClear />
              </Form.Item>
              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <Form.Item name="exempted_from" label={t("fieldExemptedFrom")}>
                  <DatePicker className="w-full" format={dayjsDatePattern()} />
                </Form.Item>
                <Form.Item name="exempted_to" label={t("fieldExemptedTo")}>
                  <DatePicker className="w-full" format={dayjsDatePattern()} />
                </Form.Item>
              </div>
            </>
          ) : null
        }
      </Form.Item>

      <Divider titlePlacement="start" className="!mt-6">
        {t("drawerSectionNotes")}
      </Divider>

      <Form.Item name="notes" label={t("fieldNotes")}>
        <Input.TextArea rows={3} placeholder={t("fieldNotesPlaceholder")} />
      </Form.Item>
    </Form>
  );
}
