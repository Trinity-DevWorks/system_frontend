"use client";

import { fetchCentralModules } from "@/features/central/modules/api/modules.api";
import { CENTRAL_MODULES_QUERY_KEY } from "@/features/central/modules/queries/modulesQueryKeys";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { Checkbox, Divider, Form, Input, InputNumber, Select, Spin, Switch, Tag, Typography } from "antd";
import { BILLING_CYCLES } from "../../utils/planDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 * }} props
 */
export default function PlanDrawerForm({ form, readOnly, t }) {
  const modulesQuery = useQuery({
    queryKey: CENTRAL_MODULES_QUERY_KEY,
    queryFn: fetchCentralModules,
    staleTime: QUERY_STALE_TIME.default,
  });
  const catalog = Array.isArray(modulesQuery.data) ? modulesQuery.data : [];

  const limitItem = (name, label) => (
    <Form.Item name={name} label={label} rules={[{ type: "integer", min: 0, message: t("fieldLimitInvalid") }]}>
      <InputNumber className="!w-full" min={0} precision={0} placeholder={t("unlimited")} />
    </Form.Item>
  );

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item
        name="name"
        label={t("fieldName")}
        rules={[
          { required: true, whitespace: true, message: t("fieldNameRequired") },
          { max: 100, message: t("fieldNameMax") },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="description" label={t("fieldDescription")}>
        <Input.TextArea rows={2} allowClear maxLength={1000} />
      </Form.Item>

      <div className="grid gap-x-4 sm:grid-cols-3">
        <Form.Item
          name="price"
          label={t("fieldPrice")}
          rules={[{ required: true, message: t("fieldPriceRequired") }]}
        >
          <InputNumber className="!w-full" min={0} precision={2} step={1} />
        </Form.Item>
        <Form.Item
          name="currency"
          label={t("fieldCurrency")}
          normalize={(v) => (typeof v === "string" ? v.toUpperCase() : v)}
          rules={[
            { required: true, message: t("fieldCurrencyRequired") },
            { pattern: /^[A-Za-z]{3}$/, message: t("fieldCurrencyInvalid") },
          ]}
        >
          <Input maxLength={3} autoComplete="off" placeholder="USD" />
        </Form.Item>
        <Form.Item name="billing_cycle" label={t("fieldBillingCycle")} rules={[{ required: true }]}>
          <Select options={BILLING_CYCLES.map((c) => ({ value: c, label: t(`cycle_${c}`) }))} />
        </Form.Item>
      </div>

      <Divider titlePlacement="start" className="!mt-1">
        {t("sectionLimits")}
      </Divider>
      <Typography.Paragraph type="secondary" className="!-mt-2 text-xs">
        {t("limitsHint")}
      </Typography.Paragraph>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {limitItem("max_users", t("fieldMaxUsers"))}
        {limitItem("max_branches", t("fieldMaxBranches"))}
        {limitItem("max_warehouses", t("fieldMaxWarehouses"))}
        {limitItem("max_storage_mb", t("fieldMaxStorage"))}
      </div>

      <Divider titlePlacement="start" className="!mt-1">
        {t("sectionModules")}
      </Divider>
      <Typography.Paragraph type="secondary" className="!-mt-2 text-xs">
        {t("modulesHint")}
      </Typography.Paragraph>
      {modulesQuery.isPending ? (
        <Spin size="small" />
      ) : (
        <Form.Item name="modules" className="!mb-4">
          <Checkbox.Group className="!flex !flex-col gap-2">
            {catalog.map((m) => {
              const code = String(m.code);
              const isCore = Boolean(m.is_core) || code === "core";
              return (
                <Checkbox key={code} value={code} disabled={isCore}>
                  <span>{String(m.name ?? code)}</span>
                  {isCore ? (
                    <Tag className="ms-2" variant="outlined">
                      {t("coreTag")}
                    </Tag>
                  ) : null}
                </Checkbox>
              );
            })}
          </Checkbox.Group>
        </Form.Item>
      )}

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked" extra={t("fieldStatusHint")}>
          <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
        </Form.Item>
        <Form.Item name="sort_order" label={t("fieldSortOrder")}>
          <InputNumber className="!w-full" min={0} precision={0} />
        </Form.Item>
      </div>
    </Form>
  );
}
