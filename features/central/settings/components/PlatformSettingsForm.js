"use client";

import { Form, Select } from "antd";
import { useMemo } from "react";

/**
 * @returns {{ value: string, label: string }[]}
 */
function timezoneOptions() {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone").map((tz) => ({ value: tz, label: tz }));
    }
  } catch {
    /* fall through */
  }
  return ["UTC", "Asia/Beirut", "Asia/Riyadh", "Asia/Dubai", "Europe/London", "America/New_York"].map((tz) => ({
    value: tz,
    label: tz,
  }));
}

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   t: (key: string) => string;
 *   onFinish: (values: Record<string, unknown>) => void;
 *   disabled?: boolean;
 *   onValuesChange?: () => void;
 * }} props
 */
export default function PlatformSettingsForm({ form, t, onFinish, disabled = false, onValuesChange }) {
  const timezones = useMemo(() => timezoneOptions(), []);

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={disabled ? false : "optional"}
      disabled={disabled}
      onFinish={onFinish}
      onValuesChange={onValuesChange}
    >
      <div className="grid gap-x-4 sm:grid-cols-2">
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
        <Form.Item
          name="timezone"
          label={t("fieldTimezone")}
          rules={[{ required: true, message: t("fieldTimezoneRequired") }]}
        >
          <Select showSearch optionFilterProp="label" options={timezones} />
        </Form.Item>
      </div>
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
    </Form>
  );
}
