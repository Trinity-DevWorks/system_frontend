"use client";

import { Form, Input } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function SupplierGroupDrawerForm({ form, readOnly, t }) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item
        name="code"
        label={t("fieldCode")}
        rules={[
          { required: true, message: t("fieldCodeRequired") },
          { max: 50, message: t("fieldCodeMax") },
          {
            pattern: /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
            message: t("fieldCodePattern"),
          },
        ]}
      >
        <Input autoComplete="off" placeholder={t("fieldCodePlaceholder")} />
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
    </Form>
  );
}
