"use client";

import ResourceDrawerFieldLabel from "@/shared/components/resource-drawer/ResourceDrawerFieldLabel";
import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { Button, Form, Input, Space } from "antd";
import { useTranslations } from "next-intl";

/**
 * Whole-bill discount (percent or amount). The backend spreads it over the lines before tax.
 * Form fields: `header_discount_type` ("percent" | "amount") and `header_discount_value`.
 * A small %/currency button switches the type, so the field fits the totals column.
 *
 * @param {{ readOnly: boolean; currencySymbol?: string }} props
 */
export default function HeaderDiscountField({ readOnly, currencySymbol = "" }) {
  const t = useTranslations("HeaderDiscount");
  const form = Form.useFormInstance();
  const type = Form.useWatch("header_discount_type", form) === "amount" ? "amount" : "percent";

  return (
    <div className="resource-drawer-pricing-card">
      <Form.Item
        label={<ResourceDrawerFieldLabel text={t("label")} />}
        className="mb-0"
        layout="horizontal"
        colon={false}
      >
        {/* Registered so validateFields returns it; switched by the button below. */}
        <div style={{ display: "none" }}>
          <Form.Item name="header_discount_type" noStyle>
            <Input />
          </Form.Item>
        </div>
        <Space.Compact className="header-discount-control">
          <Form.Item
            name="header_discount_value"
            noStyle
            rules={[
              {
                validator: (_, value) =>
                  type === "percent" && Number(value ?? 0) > 100
                    ? Promise.reject(new Error(t("percentMax")))
                    : Promise.resolve(),
              },
            ]}
          >
            <TenantNumberInput
              kind={type === "percent" ? "percent" : "money"}
              min={0}
              max={type === "percent" ? 100 : undefined}
              disabled={readOnly}
              className="header-discount-input"
            />
          </Form.Item>
          <Button
            disabled={readOnly}
            className="header-discount-toggle"
            title={t(type === "percent" ? "switchToAmount" : "switchToPercent")}
            onClick={() => form.setFieldValue("header_discount_type", type === "percent" ? "amount" : "percent")}
          >
            {type === "percent" ? "%" : currencySymbol || t("amount")}
          </Button>
        </Space.Compact>
      </Form.Item>
    </div>
  );
}
