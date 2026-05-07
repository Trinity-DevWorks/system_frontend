"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { Alert, Form, Input, InputNumber, Select, Switch } from "antd";

const PHONE_MAX = 32;

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   mode: "create" | "edit" | "view";
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   supplierGroupOptions: { value: unknown; label: string }[];
 *   supplierGroupsPending: boolean;
 *   supplierGroupsError: unknown;
 * }} props
 */
export default function SupplierDrawerForm({
  form,
  mode,
  readOnly,
  t,
  tApiErrors,
  supplierGroupOptions,
  supplierGroupsPending,
  supplierGroupsError,
}) {
  const showCode = mode !== "create";
  const showOpeningBalance = mode === "create";

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
      }}
    >
      {supplierGroupsError ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message={getLocalizedApiErrorMessage(tApiErrors, supplierGroupsError)}
        />
      ) : null}

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

      <Form.Item name="supplier_group_id" label={t("fieldSupplierGroup")} rules={[{ required: false }]}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={supplierGroupsPending}
          placeholder={t("fieldSupplierGroupPlaceholder")}
          options={supplierGroupOptions}
        />
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

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="credit_limit"
          label={t("fieldCreditLimit")}
          rules={[
            {
              type: "number",
              min: 0,
              message: t("fieldCreditLimitMin"),
            },
          ]}
        >
          <InputNumber className="w-full" min={0} step={0.0001} precision={4} placeholder="0" />
        </Form.Item>

        {showOpeningBalance ? (
          <Form.Item name="opening_balance" label={t("fieldOpeningBalance")}>
            <InputNumber className="w-full" step={0.0001} precision={4} placeholder="0" />
          </Form.Item>
        ) : (
          <Form.Item name="opening_balance" label={t("fieldOpeningBalance")}>
            <InputNumber className="w-full" disabled readOnly step={0.0001} precision={4} />
          </Form.Item>
        )}
      </div>

      <Form.Item name="is_active" label={t("fieldIsActive")} valuePropName="checked">
        <Switch />
      </Form.Item>

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

      <Form.Item name="notes" label={t("fieldNotes")}>
        <Input.TextArea rows={3} placeholder={t("fieldNotesPlaceholder")} />
      </Form.Item>
    </Form>
  );
}
