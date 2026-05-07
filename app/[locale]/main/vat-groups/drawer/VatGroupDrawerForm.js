"use client";

/*
 * Form fields for a VAT group (abbreviation, name, percentage, default switch).
 */

import { Form, Input, InputNumber, Space, Switch } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function VatGroupDrawerForm({ form, readOnly, t }) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item
        name="abrv"
        label={t("fieldAbbreviation")}
        rules={[
          { required: true, message: t("fieldAbbreviationRequired") },
          { max: 50, message: t("fieldAbbreviationMax") },
          {
            pattern: /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
            message: t("fieldAbbreviationPattern"),
          },
        ]}
      >
        <Input autoComplete="off" placeholder={t("fieldAbbreviationPlaceholder")} />
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
      <Form.Item
        name="percentage"
        label={t("fieldPercentage")}
        rules={[
          { required: true, message: t("fieldPercentageRequired") },
          {
            validator: (_, value) => {
              const n = Number(value);
              if (!Number.isFinite(n)) return Promise.reject(new Error(t("fieldPercentageInvalid")));
              if (n < 0 || n > 100) return Promise.reject(new Error(t("fieldPercentageRange")));
              return Promise.resolve();
            },
          },
        ]}
      >
        <Space.Compact block className="w-full">
          <InputNumber
            min={0}
            max={100}
            step={0.01}
            controls={false}
            className="min-w-0 flex-1"
          />
          <Input
            readOnly
            value="%"
            tabIndex={-1}
            className="w-10 text-center"
            aria-hidden
          />
        </Space.Compact>
      </Form.Item>
      <Form.Item name="is_default" label={t("fieldDefault")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
    </Form>
  );
}
