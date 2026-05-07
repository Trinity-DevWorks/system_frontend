"use client";

import { Form, Input, Select, Switch } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function UnitGroupDrawerForm({ form, readOnly, t }) {
  const dimensionOptions = [
    { value: "count", label: t("dimensionCount") },
    { value: "weight", label: t("dimensionWeight") },
    { value: "length", label: t("dimensionLength") },
    { value: "volume", label: t("dimensionVolume") },
    { value: "other", label: t("dimensionOther") },
  ];

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
      <Form.Item
        name="dimension_type"
        label={t("fieldDimensionType")}
        rules={[{ required: true, message: t("fieldDimensionTypeRequired") }]}
      >
        <Select options={dimensionOptions} />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
    </Form>
  );
}
