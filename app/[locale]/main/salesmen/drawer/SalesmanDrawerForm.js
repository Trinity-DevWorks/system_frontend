"use client";

import { SALESMAN_COMMISSION_TYPES } from "./salesmanDrawerUtils";
import { dayjsDatePattern } from "@/lib/tenant-format";
import { Form, Input, InputNumber, Select, Switch, DatePicker, Typography } from "antd";
import { useEffect } from "react";

const { TextArea } = Input;

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   warehouseOptions: { value: number | string; label: string }[];
 *   addWarehouseSentinel?: string | null;
 *   onOpenWarehouseDrawer?: () => void;
 *   userOptions: { value: number; label: string }[];
 *   lookupsLoading?: boolean;
 * }} props
 */
export default function SalesmanDrawerForm({
  form,
  readOnly,
  t,
  warehouseOptions,
  addWarehouseSentinel = null,
  onOpenWarehouseDrawer,
  userOptions,
  lookupsLoading,
}) {
  const commissionType = Form.useWatch("commission_type", form);

  useEffect(() => {
    if (commissionType === "none") {
      form.setFieldValue("commission_value", undefined);
    }
  }, [commissionType, form]);

  const sentinel = addWarehouseSentinel != null ? String(addWarehouseSentinel) : null;
  const warehouseGetValueFromEvent = sentinel
    ? (/** @type {number | string | undefined | null} */ v) => (v === sentinel ? form.getFieldValue("warehouse_id") : v)
    : undefined;
  const warehouseOnSelect =
    sentinel && onOpenWarehouseDrawer
      ? (/** @type {number | string} */ value) => {
          if (value === sentinel) {
            onOpenWarehouseDrawer();
          }
        }
      : undefined;

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item name="salesman_code" label={t("fieldSalesmanCode")} rules={[{ max: 64, message: t("fieldSalesmanCodeMax") }]}>
        <Input autoComplete="off" placeholder={t("fieldSalesmanCodePlaceholder")} />
      </Form.Item>
      <Form.Item
        name="first_name"
        label={t("fieldFirstName")}
        rules={[
          { required: true, message: t("fieldFirstNameRequired") },
          { max: 255, message: t("fieldFirstNameMax") },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="last_name"
        label={t("fieldLastName")}
        rules={[
          { required: true, message: t("fieldLastNameRequired") },
          { max: 255, message: t("fieldLastNameMax") },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="phone" label={t("fieldPhone")} rules={[{ max: 32, message: t("fieldPhoneMax") }]}>
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="email" label={t("fieldEmail")} rules={[{ max: 255, message: t("fieldEmailMax") }]}>
        <Input autoComplete="off" type="email" />
      </Form.Item>
      <Form.Item name="address" label={t("fieldAddress")}>
        <TextArea rows={2} />
      </Form.Item>
      <Form.Item name="commission_type" label={t("fieldCommissionType")} rules={[{ required: true }]}>
        <Select
          options={SALESMAN_COMMISSION_TYPES.map((value) => ({
            value,
            label: t(`commission_${value}`),
          }))}
        />
      </Form.Item>
      {commissionType !== "none" && (
        <Form.Item
          name="commission_value"
          label={t("fieldCommissionValue")}
          rules={[
            { required: true, message: t("fieldCommissionValueRequired") },
            {
              validator: (_, v) => {
                const n = Number(v);
                if (!Number.isFinite(n) || n < 0) return Promise.reject(new Error(t("fieldCommissionValueInvalid")));
                if (commissionType === "percent" && n > 100) {
                  return Promise.reject(new Error(t("fieldCommissionPercentMax")));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <div className="flex items-center gap-2">
            <InputNumber
              className="w-36"
              min={0}
              max={commissionType === "percent" ? 100 : undefined}
              precision={4}
            />
            {commissionType === "fixed" ? (
              <Typography.Text type="secondary" className="shrink-0 text-sm">
                {t("fieldCommissionBaseCurrency")}
              </Typography.Text>
            ) : null}
          </div>
        </Form.Item>
      )}
      <Form.Item name="target_amount" label={t("fieldTargetAmount")}>
        <InputNumber className="w-full" min={0} precision={4} />
      </Form.Item>
      <Form.Item name="hire_date" label={t("fieldHireDate")}>
        <DatePicker className="w-full" format={dayjsDatePattern()} allowClear />
      </Form.Item>
      <Form.Item name="warehouse_id" label={t("fieldWarehouse")} getValueFromEvent={warehouseGetValueFromEvent}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={lookupsLoading}
          options={warehouseOptions}
          placeholder={t("fieldWarehousePlaceholder")}
          onSelect={warehouseOnSelect}
        />
      </Form.Item>
      <Form.Item name="user_id" label={t("fieldUser")}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={lookupsLoading}
          options={userOptions}
          placeholder={t("fieldUserPlaceholder")}
        />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
      <Form.Item name="notes" label={t("fieldNotes")}>
        <TextArea rows={3} />
      </Form.Item>
    </Form>
  );
}
