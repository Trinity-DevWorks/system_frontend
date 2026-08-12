"use client";

import { Form, Input, Switch } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   mode: "create" | "edit" | "view";
 *   systemRole: boolean;
 *   ownerRole?: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function RoleDrawerForm({ form, readOnly, mode, systemRole, ownerRole = false, t }) {
  const nameDisabled = readOnly || (mode === "edit" && systemRole);

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item
        name="name"
        label={t("fieldName")}
        rules={[
          { required: true, message: t("fieldNameRequired") },
          { max: 100, message: t("fieldNameMax") },
        ]}
        extra={ownerRole ? t("fieldOwnerImmutableHint") : systemRole ? t("fieldNameSystemHint") : undefined}
      >
        <Input autoComplete="off" disabled={nameDisabled} />
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
