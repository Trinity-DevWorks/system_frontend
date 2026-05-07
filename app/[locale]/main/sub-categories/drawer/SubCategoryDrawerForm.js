"use client";

/*
 * Form fields for a sub-category (parent category, name, color) plus an error alert if loading categories failed.
 * No save logic here—only labels, inputs, and validation rules.
 */

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { Alert, ColorPicker, Form, Input, Select } from "antd";
import { COLOR_PATTERN } from "./subCategoryDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   categoryOptions: { value: unknown; label: string }[];
 *   categoriesPending: boolean;
 *   categoriesError: unknown;
 * }} props
 */
export default function SubCategoryDrawerForm({
  form,
  readOnly,
  t,
  tApiErrors,
  categoryOptions,
  categoriesPending,
  categoriesError,
}) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      {categoriesError ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message={getLocalizedApiErrorMessage(tApiErrors, categoriesError)}
        />
      ) : null}
      <Form.Item
        name="category_id"
        label={t("fieldCategory")}
        rules={[{ required: true, message: t("fieldCategoryRequired") }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={categoryOptions}
          loading={categoriesPending}
          placeholder={t("fieldCategoryPlaceholder")}
          allowClear={false}
        />
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
    </Form>
  );
}
