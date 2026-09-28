"use client";

import { Form, Input, Switch } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   systemRole: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function CentralRoleDrawerForm({ form, readOnly, systemRole, t }) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item
        name="name"
        label={t("fieldName")}
        rules={[
          { required: true, whitespace: true, message: t("fieldNameRequired") },
          { max: 100, message: t("fieldNameMax") },
        ]}
        extra={systemRole ? t("fieldSystemImmutableHint") : undefined}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="description" label={t("fieldDescription")}>
        <Input.TextArea rows={2} allowClear />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
    </Form>
  );
}
