"use client";

/*
 * Form fields for a warehouse (name, shortcut name, active/default switches).
 */

import { Form, Input, Switch } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function WarehouseDrawerForm({ form, readOnly, t }) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
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
        name="shortcut_name"
        label={t("fieldShortcutName")}
        rules={[
          { required: true, message: t("fieldShortcutNameRequired") },
          { max: 50, message: t("fieldShortcutNameMax") },
          {
            pattern: /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
            message: t("fieldShortcutNamePattern"),
          },
        ]}
      >
        <Input autoComplete="off" placeholder={t("fieldShortcutNamePlaceholder")} />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
      <Form.Item name="is_default" label={t("fieldDefault")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
      <Form.Item name="is_default_sales" label={t("fieldDefaultSales")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
      <Form.Item name="is_default_production" label={t("fieldDefaultProduction")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
      <Form.Item name="is_default_purchase" label={t("fieldDefaultPurchase")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
      <Form.Item name="is_default_storage" label={t("fieldDefaultStorage")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
    </Form>
  );
}
