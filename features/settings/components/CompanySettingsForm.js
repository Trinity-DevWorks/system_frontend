"use client";

import { inventoryCostingMethodOptions } from "@/lib/inventory-costing";
import { Form, Input, InputNumber, Select, Switch } from "antd";
import { useMemo } from "react";

/**
 * @returns {{ value: string, label: string }[]}
 */
function timezoneOptions() {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone").map((tz) => ({
        value: tz,
        label: tz,
      }));
    }
  } catch {
    /* fall through */
  }
  return [
    { value: "UTC", label: "UTC" },
    { value: "Asia/Beirut", label: "Asia/Beirut" },
    { value: "Asia/Riyadh", label: "Asia/Riyadh" },
    { value: "Asia/Dubai", label: "Asia/Dubai" },
    { value: "Europe/London", label: "Europe/London" },
    { value: "America/New_York", label: "America/New_York" },
  ];
}

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   t: (key: string) => string;
 *   onFinish: (values: Record<string, unknown>) => void;
 *   primaryCurrencyLabel?: string | null;
 *   disabled?: boolean;
 *   onValuesChange?: () => void;
 * }} props
 */
export default function CompanySettingsForm({
  form,
  t,
  onFinish,
  primaryCurrencyLabel,
  disabled = false,
  onValuesChange,
}) {
  const timezones = useMemo(() => timezoneOptions(), []);

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={disabled ? false : "optional"}
      className="max-w-2xl"
      disabled={disabled}
      onFinish={onFinish}
      onValuesChange={onValuesChange}
    >
      {primaryCurrencyLabel ? (
        <div className="mb-4 text-sm opacity-80">
          {t("primaryCurrencyReadonly", { currency: primaryCurrencyLabel })}
        </div>
      ) : (
        <div className="mb-4 text-sm opacity-80">{t("primaryCurrencyEmpty")}</div>
      )}

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="country"
          label={t("fieldCountry")}
          rules={[
            {
              validator: async (_, value) => {
                if (value == null || value === "") return;
                if (!/^[A-Za-z]{2}$/.test(String(value))) {
                  throw new Error(t("fieldCountryPattern"));
                }
              },
            },
          ]}
          normalize={(value) =>
            typeof value === "string" ? value.toUpperCase() : value
          }
        >
          <Input maxLength={2} placeholder={t("fieldCountryPlaceholder")} />
        </Form.Item>
        <Form.Item
          name="preferred_language"
          label={t("fieldPreferredLanguage")}
          rules={[{ required: true, message: t("fieldPreferredLanguageRequired") }]}
        >
          <Select
            options={[
              { value: "en", label: t("languageEn") },
              { value: "ar", label: t("languageAr") },
            ]}
          />
        </Form.Item>
      </div>

      <Form.Item
        name="timezone"
        label={t("fieldTimezone")}
        rules={[{ required: true, message: t("fieldTimezoneRequired") }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={timezones}
        />
      </Form.Item>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="date_format"
          label={t("fieldDateFormat")}
          rules={[{ required: true, message: t("fieldDateFormatRequired") }]}
        >
          <Select
            options={[
              { value: "Y-m-d", label: t("dateFormatYmdDash") },
              { value: "d/m/Y", label: t("dateFormatDmYSlash") },
              { value: "m/d/Y", label: t("dateFormatMdYSlash") },
              { value: "d-m-Y", label: t("dateFormatDmYDash") },
              { value: "d.m.Y", label: t("dateFormatDmYDot") },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="number_format"
          label={t("fieldNumberFormat")}
          rules={[{ required: true, message: t("fieldNumberFormatRequired") }]}
        >
          <Select
            options={[
              { value: "comma_dot", label: t("numberFormatCommaDot") },
              { value: "dot_comma", label: t("numberFormatDotComma") },
              { value: "space_dot", label: t("numberFormatSpaceDot") },
              { value: "space_comma", label: t("numberFormatSpaceComma") },
            ]}
          />
        </Form.Item>
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="price_rounding_mode"
          label={t("fieldPriceRoundingMode")}
          rules={[
            { required: true, message: t("fieldPriceRoundingModeRequired") },
          ]}
        >
          <Select
            options={[
              { value: "half_up", label: t("roundingHalfUp") },
              { value: "half_even", label: t("roundingHalfEven") },
              { value: "up", label: t("roundingUp") },
              { value: "down", label: t("roundingDown") },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="price_decimal_places"
          label={t("fieldPriceDecimalPlaces")}
          rules={[
            { required: true, message: t("fieldPriceDecimalPlacesRequired") },
          ]}
        >
          <InputNumber className="w-full" min={0} max={6} precision={0} />
        </Form.Item>
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="tax_enabled"
          label={t("fieldTaxEnabled")}
          extra={t("fieldTaxEnabledHelp")}
          valuePropName="checked"
        >
          <Switch
            checkedChildren={t("switchOn")}
            unCheckedChildren={t("switchOff")}
          />
        </Form.Item>
        <Form.Item
          name="tax_price_mode"
          label={t("fieldTaxPriceMode")}
          extra={t("fieldTaxPriceModeHelp")}
          rules={[{ required: true, message: t("fieldTaxPriceModeRequired") }]}
        >
          <Select
            options={[
              { value: "exclusive", label: t("taxPriceModeExclusive") },
              { value: "inclusive", label: t("taxPriceModeInclusive") },
            ]}
          />
        </Form.Item>
      </div>
      <Form.Item
        name="inventory_costing_method"
        label={t("fieldInventoryCostingMethod")}
        extra={t("fieldInventoryCostingMethodHelp")}
        rules={[{ required: true, message: t("fieldInventoryCostingMethodRequired") }]}
      >
        <Select options={inventoryCostingMethodOptions(t)} />
      </Form.Item>
      <Form.Item
        name="allow_negative_stock"
        label={t("fieldAllowNegativeStock")}
        extra={t("fieldAllowNegativeStockHelp")}
        valuePropName="checked"
      >
        <Switch
          checkedChildren={t("switchOn")}
          unCheckedChildren={t("switchOff")}
        />
      </Form.Item>
    </Form>
  );
}
