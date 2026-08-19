"use client";

import LookupSelectWithCreate from "@/components/resource-drawer/LookupSelectWithCreate";
import { buildParentCategoryOptions } from "@/lib/categories/categoryTree";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/app-theme";
import { ColorPicker, Form, Input, Switch } from "antd";
import { CATEGORY_LOOKUP_ADD_PARENT, CODE_PATTERN, COLOR_PATTERN } from "./categoryDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   categories: unknown[];
 *   categoriesPending?: boolean;
 *   excludeCategoryId?: number | null;
 *   onOpenParentCategoryDrawer?: () => void;
 * }} props
 */
export default function CategoryDrawerForm({
  form,
  readOnly,
  t,
  categories,
  categoriesPending,
  excludeCategoryId = null,
  onOpenParentCategoryDrawer,
}) {
  const parentOptions = buildParentCategoryOptions(categories, excludeCategoryId);

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <LookupSelectWithCreate
        form={form}
        name="parent_id"
        label={t("fieldParent")}
        readOnly={readOnly}
        addNewSentinel={CATEGORY_LOOKUP_ADD_PARENT}
        addNewLabel={t("fieldParentAddNew")}
        onAddNew={onOpenParentCategoryDrawer}
        options={parentOptions}
        loading={categoriesPending}
        placeholder={t("fieldParentPlaceholder")}
      />
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
          return DEFAULT_CATEGORY_COLOR;
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
