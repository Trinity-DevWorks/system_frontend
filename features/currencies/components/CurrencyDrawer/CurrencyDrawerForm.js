"use client";

import { Collapse, Form, Input, Switch } from "antd";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function CurrencyDrawerForm({ form, readOnly, t }) {
  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Collapse
        bordered={false}
        defaultActiveKey={["general"]}
        className="-mx-1 bg-transparent [&_.ant-collapse-item]:border-slate-200/80 dark:[&_.ant-collapse-item]:border-slate-700/80"
        items={[
          {
            key: "general",
            label: t("sectionGeneral"),
            children: (
              <>
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
                  name="code"
                  label={t("fieldCode")}
                  rules={[
                    { required: true, message: t("fieldCodeRequired") },
                    { max: 10, message: t("fieldCodeMax") },
                  ]}
                >
                  <Input autoComplete="off" />
                </Form.Item>
                <Form.Item
                  name="iso_code"
                  label={t("fieldIsoCode")}
                  rules={[
                    { required: true, message: t("fieldIsoCodeRequired") },
                    { max: 10, message: t("fieldIsoCodeMax") },
                  ]}
                >
                  <Input autoComplete="off" />
                </Form.Item>
                <Form.Item name="symbol" label={t("fieldSymbol")} rules={[{ max: 16, message: t("fieldSymbolMax") }]}>
                  <Input autoComplete="off" placeholder={t("fieldSymbolPlaceholder")} />
                </Form.Item>
                <Form.Item name="is_active" label={t("fieldActive")} valuePropName="checked">
                  <Switch checkedChildren={t("activeYes")} unCheckedChildren={t("activeNo")} />
                </Form.Item>
                <Form.Item name="is_primary" label={t("fieldPrimary")} valuePropName="checked">
                  <Switch checkedChildren={t("primaryYes")} unCheckedChildren={t("primaryNo")} />
                </Form.Item>
              </>
            ),
          },
          {
            key: "rounding",
            label: t("sectionRounding"),
            children: (
              <>
                <Form.Item name="smallest_unit" label={t("fieldSmallestUnit")}>
                  <TenantNumberInput kind="money" min={0} className="w-full" controls={false} />
                </Form.Item>
                <Form.Item name="round_limit" label={t("fieldRoundLimit")}>
                  <TenantNumberInput kind="money" min={0} className="w-full" controls={false} />
                </Form.Item>
                <Form.Item name="acceptable_amount_overdue" label={t("fieldAcceptableOverdue")}>
                  <TenantNumberInput kind="money" min={0} className="w-full" controls={false} />
                </Form.Item>
                <Form.Item name="allowed_difference_in_receipt" label={t("fieldAllowedDiffReceipt")}>
                  <TenantNumberInput kind="money" min={0} className="w-full" controls={false} />
                </Form.Item>
                <Form.Item name="allowed_difference_in_payment" label={t("fieldAllowedDiffPayment")}>
                  <TenantNumberInput kind="money" min={0} className="w-full" controls={false} />
                </Form.Item>
              </>
            ),
          },
        ]}
      />

    </Form>
  );
}
