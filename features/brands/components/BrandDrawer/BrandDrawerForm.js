"use client";

import { Alert, Form, Input, Select, Switch } from "antd";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { CODE_PATTERN } from "../../utils/brandDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   parentBrandOptions: { value: number; label: string }[];
 *   brandsPending: boolean;
 *   brandsError: unknown;
 * }} props
 */
export default function BrandDrawerForm({
  form,
  readOnly,
  t,
  tApiErrors,
  parentBrandOptions,
  brandsPending,
  brandsError,
}) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      {brandsError ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          title={getLocalizedApiErrorMessage(tApiErrors, brandsError)}
        />
      ) : null}
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
      <Form.Item name="parent_brand_id" label={t("fieldSubBrandOf")}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={brandsPending}
          placeholder={t("fieldSubBrandOfPlaceholder")}
          options={parentBrandOptions}
        />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
    </Form>
  );
}
