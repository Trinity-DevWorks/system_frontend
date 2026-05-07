"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { Alert, Form, Input, InputNumber, Select, Switch } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 *   unitGroupOptions: { value: unknown; label: string }[];
 *   unitGroupsPending: boolean;
 *   unitGroupsError: unknown;
 * }} props
 */
export default function UnitOfMeasurementDrawerForm({
  form,
  readOnly,
  t,
  tApiErrors,
  unitGroupOptions,
  unitGroupsPending,
  unitGroupsError,
}) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      {unitGroupsError ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message={getLocalizedApiErrorMessage(tApiErrors, unitGroupsError)}
        />
      ) : null}
      <Form.Item
        name="unit_group_id"
        label={t("fieldUnitGroup")}
        rules={[{ required: true, message: t("fieldUnitGroupRequired") }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={unitGroupOptions}
          loading={unitGroupsPending}
          placeholder={t("fieldUnitGroupPlaceholder")}
          allowClear={false}
        />
      </Form.Item>
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
      <Form.Item name="symbol" label={t("fieldSymbol")} rules={[{ max: 32, message: t("fieldSymbolMax") }]}>
        <Input autoComplete="off" placeholder={t("fieldSymbolPlaceholder")} />
      </Form.Item>
      <Form.Item
        name="decimal_places"
        label={t("fieldDecimalPlaces")}
        rules={[
          { required: true, message: t("fieldDecimalPlacesRequired") },
          {
            validator: (_, value) => {
              const n = Number(value);
              if (!Number.isFinite(n)) return Promise.reject(new Error(t("fieldDecimalPlacesInvalid")));
              if (n < 0 || n > 6) return Promise.reject(new Error(t("fieldDecimalPlacesRange")));
              return Promise.resolve();
            },
          },
        ]}
      >
        <InputNumber min={0} max={6} step={1} className="w-full" controls={false} />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
    </Form>
  );
}
