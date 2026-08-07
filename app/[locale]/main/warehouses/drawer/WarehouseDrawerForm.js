"use client";

import { Form, Input, Select, Switch } from "antd";
import { useEffect } from "react";
import { getActiveBranchId } from "@/lib/active-branch";
import { WAREHOUSE_TYPES } from "./warehouseDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   branchOptions?: { value: number; label: string }[];
 *   userOptions?: { value: string; label: string }[];
 *   lookupsLoading?: boolean;
 * }} props
 */
export default function WarehouseDrawerForm({
  form,
  readOnly,
  t,
  branchOptions = [],
  userOptions = [],
  lookupsLoading = false,
}) {
  const typeWatch = Form.useWatch("type", form);
  const branchIdWatch = Form.useWatch("branch_id", form);
  const isBranchType = typeWatch === "branch";

  useEffect(() => {
    if (readOnly) return;
    const managerId = form.getFieldValue("manager_id");
    if (managerId == null || managerId === "") return;
    const stillAllowed = userOptions.some((opt) => String(opt.value) === String(managerId));
    if (!stillAllowed) {
      form.setFieldValue("manager_id", undefined);
    }
  }, [typeWatch, branchIdWatch, userOptions, form, readOnly]);

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
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
        name="shortcut_name"
        label={t("fieldShortcutName")}
        rules={[
          { required: true, message: t("fieldShortcutNameRequired") },
          { max: 50, message: t("fieldShortcutNameMax") },
          {
            pattern: /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
            message: t("fieldShortcutNamePattern"),
          },
        ]}
      >
        <Input autoComplete="off" placeholder={t("fieldShortcutNamePlaceholder")} />
      </Form.Item>
      <Form.Item
        name="type"
        label={t("fieldType")}
        rules={[{ required: true, message: t("fieldTypeRequired") }]}
      >
        <Select
          options={WAREHOUSE_TYPES.map((value) => ({
            value,
            label: t(`type_${value}`),
          }))}
          onChange={(value) => {
            if (value !== "branch") {
              form.setFieldValue("branch_id", undefined);
            } else {
              const activeId = getActiveBranchId();
              if (activeId != null) {
                form.setFieldValue("branch_id", activeId);
              }
            }
          }}
        />
      </Form.Item>
      {isBranchType ? (
        <Form.Item
          name="branch_id"
          label={t("fieldBranch")}
          rules={[{ required: true, message: t("fieldBranchRequired") }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={lookupsLoading}
            options={branchOptions}
            placeholder={t("fieldBranchPlaceholder")}
            disabled={!readOnly}
          />
        </Form.Item>
      ) : null}
      <Form.Item name="address" label={t("fieldAddress")} rules={[{ max: 2000, message: t("fieldAddressMax") }]}>
        <Input.TextArea rows={2} autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="description"
        label={t("fieldDescription")}
        rules={[{ max: 5000, message: t("fieldDescriptionMax") }]}
      >
        <Input.TextArea rows={3} autoComplete="off" />
      </Form.Item>
      <Form.Item name="manager_id" label={t("fieldManager")}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={lookupsLoading}
          options={userOptions}
          placeholder={
            isBranchType && (branchIdWatch == null || branchIdWatch === "")
              ? t("fieldManagerSelectBranchFirst")
              : t("fieldManagerPlaceholder")
          }
          disabled={!readOnly && isBranchType && (branchIdWatch == null || branchIdWatch === "")}
        />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
      <Form.Item name="is_default" label={t("fieldDefault")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
      <Form.Item name="is_default_sales" label={t("fieldDefaultSales")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
      <Form.Item name="is_default_production" label={t("fieldDefaultProduction")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
      <Form.Item name="is_default_purchase" label={t("fieldDefaultPurchase")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
      <Form.Item name="is_default_storage" label={t("fieldDefaultStorage")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
    </Form>
  );
}
