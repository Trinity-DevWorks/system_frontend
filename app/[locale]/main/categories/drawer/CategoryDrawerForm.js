"use client";

/*
 * Just the form fields for a category (code, name, color, description, active switch).
 * No save logic here—only labels, inputs, and validation rules.
 */

import { ColorPicker, Form, Input, Switch } from "antd";
import { CODE_PATTERN, COLOR_PATTERN } from "./categoryDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function CategoryDrawerForm({ form, readOnly, t }) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item
        name="code"
        label={t("fieldCode")}
        rules={[
          { required: true, message: t("fieldCodeRequired") },
          { max: 50, message: t("fieldCodeMax") },
          {
            pattern: CODE_PATTERN,
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
        name="color"
        label={t("fieldColor")}
        rules={[
          { required: true, message: t("fieldColorRequired") },
          {
            validator: (_, value) => {
              const v = typeof value === "string" ? value : String(value ?? "");
              if (!COLOR_PATTERN.test(v)) {
                return Promise.reject(new Error(t("fieldColorInvalid")));
              }
              return Promise.resolve();
            },
          },
        ]}
        getValueFromEvent={(color, cssString) => {
          if (typeof cssString === "string" && cssString.startsWith("#")) return cssString;
          if (typeof color === "string" && color.startsWith("#")) return color;
          if (color && typeof color.toHexString === "function") return color.toHexString();
          return "#6366F1";
        }}
      >
        <ColorPicker format="hex" showText className="w-full" />
      </Form.Item>
      <Form.Item name="description" label={t("fieldDescription")} rules={[{ max: 500, message: t("fieldDescriptionMax") }]}>
        <Input.TextArea rows={3} allowClear />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
    </Form>
  );
}
