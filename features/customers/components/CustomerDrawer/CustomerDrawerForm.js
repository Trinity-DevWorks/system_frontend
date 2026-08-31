"use client";

import LookupSelectWithCreate from "@/shared/components/resource-drawer/LookupSelectWithCreate";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { dayjsDatePattern } from "@/lib/tenant-format";
import dayjs from "dayjs";
import { Alert, Button, DatePicker, Divider, Form, Input, Radio, Select, Space, Switch, Typography } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  CUSTOMER_LOOKUP_ADD_CUSTOMER_GROUP,
  CUSTOMER_LOOKUP_ADD_PAYMENT_METHOD,
  CUSTOMER_LOOKUP_ADD_PAYMENT_TERMS,
  CUSTOMER_LOOKUP_ADD_SALESMAN,
  CUSTOMER_LOOKUP_ADD_VAT_GROUP,
} from "../../utils/customerDrawerUtils";

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
    .filter((c) => c && c.is_active !== false)
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
 *   customerGroupOptions: { value: unknown; label: string }[];
 *   customerGroupsPending: boolean;
 *   onOpenCustomerGroupDrawer?: () => void;
 *   salesmenOptions: { value: unknown; label: string }[];
 *   salesmenPending: boolean;
 *   onOpenSalesmanDrawer?: () => void;
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
 *   isSystem?: boolean;
 * }} props
 */
export default function CustomerDrawerForm({
  form,
  mode,
  readOnly,
  t,
  customerGroupOptions,
  customerGroupsPending,
  onOpenCustomerGroupDrawer,
  salesmenOptions,
  salesmenPending,
  onOpenSalesmanDrawer,
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
  isSystem = false,
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
        if (Object.prototype.hasOwnProperty.call(changed, "status") && changed.status !== "blacklisted") {
          form.setFieldValue("blacklist_reason", "");
        }
      }}
    >
      {isSystem ? (
        <Alert type="info" showIcon className="mb-4" title={t("systemWalkInNotice")} />
      ) : null}

      {showCode ? (
        <Form.Item name="customer_code" label={t("fieldCustomerCode")}>
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
        name="type"
        label={t("fieldType")}
        rules={[{ required: true, message: t("fieldTypeRequired") }]}
      >
        <Radio.Group
          options={[
            { value: "individual", label: t("fieldTypeIndividual") },
            { value: "business", label: t("fieldTypeBusiness") },
          ]}
        />
      </Form.Item>

      <LookupSelectWithCreate
        form={form}
        name="customer_group_id"
        label={t("fieldCustomerGroup")}
        readOnly={readOnly}
        addNewSentinel={CUSTOMER_LOOKUP_ADD_CUSTOMER_GROUP}
        addNewLabel={t("fieldCustomerGroupAddNew")}
        onAddNew={onOpenCustomerGroupDrawer}
        options={customerGroupOptions}
        loading={customerGroupsPending}
        placeholder={t("fieldCustomerGroupPlaceholder")}
      />

      <Divider titlePlacement="start" className="!mt-6">
        {t("drawerSectionCommercial")}
      </Divider>

      <LookupSelectWithCreate
        form={form}
        name="salesman_id"
        label={t("fieldSalesman")}
        readOnly={readOnly}
        addNewSentinel={CUSTOMER_LOOKUP_ADD_SALESMAN}
        addNewLabel={t("fieldSalesmanAddNew")}
        onAddNew={onOpenSalesmanDrawer}
        options={salesmenOptions}
        loading={salesmenPending}
        placeholder={t("fieldSalesmanPlaceholder")}
      />

      <LookupSelectWithCreate
        form={form}
        name="payment_method_id"
        label={t("fieldPaymentMethod")}
        readOnly={readOnly}
        addNewSentinel={CUSTOMER_LOOKUP_ADD_PAYMENT_METHOD}
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
        addNewSentinel={CUSTOMER_LOOKUP_ADD_PAYMENT_TERMS}
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
        addNewSentinel={CUSTOMER_LOOKUP_ADD_VAT_GROUP}
        addNewLabel={t("fieldVatGroupAddNew")}
        onAddNew={onOpenVatGroupDrawer}
        options={vatGroupOptions}
        loading={vatGroupsPending}
        placeholder={t("fieldVatGroupPlaceholder")}
      />

      <Divider titlePlacement="start" className="!mt-6">
        {t("drawerSectionContact")}
      </Divider>

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

      <Divider titlePlacement="start" className="!mt-6">
        {t("drawerSectionAccount")}
      </Divider>

      <Form.Item
        name="status"
        label={t("fieldStatus")}
        rules={[{ required: true, message: t("fieldStatusRequired") }]}
      >
        <Select
          disabled={isSystem}
          options={[
            { value: "active", label: t("statusActive") },
            { value: "suspended", label: t("statusSuspended") },
            { value: "blacklisted", label: t("statusBlacklisted") },
          ]}
        />
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.status !== cur.status}>
        {({ getFieldValue }) =>
          getFieldValue("status") === "blacklisted" ? (
            <Form.Item
              name="blacklist_reason"
              label={t("fieldBlacklistReason")}
              rules={[{ required: true, message: t("fieldBlacklistReasonRequired") }]}
            >
              <Input.TextArea rows={2} placeholder={t("fieldBlacklistReasonPlaceholder")} allowClear />
            </Form.Item>
          ) : null
        }
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
                      <TenantNumberInput kind="money" className="w-full" min={0} placeholder="0" />
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
                    <Form.Item {...restField} name={[name, "opening_balance"]} label={t("fieldOpeningBalance")} className="mb-0 min-w-[140px]">
                      <TenantNumberInput kind="money" className="w-full" placeholder="0" />
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
                      <Form.Item {...restField} name={[name, "ledger_balance"]} label={t("fieldLedgerBalance")} className="mb-0 min-w-[120px]">
                        <TenantNumberInput kind="money" className="w-full" disabled readOnly />
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

      <Divider titlePlacement="start" className="!mt-6">
        {t("drawerSectionNotes")}
      </Divider>

      <Form.Item name="notes" label={t("fieldNotes")}>
        <Input.TextArea rows={3} placeholder={t("fieldNotesPlaceholder")} />
      </Form.Item>
    </Form>
  );
}
