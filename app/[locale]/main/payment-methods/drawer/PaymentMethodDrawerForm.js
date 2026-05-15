"use client";

import { PAYMENT_METHOD_TYPE_VALUES } from "./paymentMethodDrawerUtils";
import { Form, Input, Select, Switch } from "antd";

const { TextArea } = Input;

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   currencyOptions: { value: number; label: string }[];
 *   currencyLoading?: boolean;
 * }} props
 */
export default function PaymentMethodDrawerForm({ form, readOnly, t, currencyOptions, currencyLoading }) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item
        name="code"
        label={t("fieldCode")}
        rules={[
          { required: true, message: t("fieldCodeRequired") },
          { max: 64, message: t("fieldCodeMax") },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="name"
        label={t("fieldName")}
        rules={[
          { required: true, message: t("fieldNameRequired") },
          { max: 255, message: t("fieldNameMax") },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="type" label={t("fieldType")} rules={[{ required: true, message: t("fieldTypeRequired") }]}>
        <Select
          options={PAYMENT_METHOD_TYPE_VALUES.map((value) => ({
            value,
            label: t(`type_${value}`),
          }))}
        />
      </Form.Item>
      <Form.Item name="currency_id" label={t("fieldCurrency")}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={currencyLoading}
          options={currencyOptions}
          placeholder={t("fieldCurrencyPlaceholder")}
        />
      </Form.Item>
      <Form.Item name="requires_reference" label={t("fieldRequiresReference")} valuePropName="checked">
        <Switch checkedChildren={t("yes")} unCheckedChildren={t("no")} />
      </Form.Item>
      <Form.Item name="supports_change" label={t("fieldSupportsChange")} valuePropName="checked">
        <Switch checkedChildren={t("yes")} unCheckedChildren={t("no")} />
      </Form.Item>
      <Form.Item name="is_default" label={t("fieldDefault")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
      <Form.Item name="notes" label={t("fieldNotes")}>
        <TextArea rows={3} />
      </Form.Item>
    </Form>
  );
}
