"use client";

import { Form, Input, Select, Switch, TimePicker } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   userOptions?: { value: string; label: string }[];
 *   lookupsLoading?: boolean;
 * }} props
 */
export default function BranchDrawerForm({ form, readOnly, t, userOptions = [], lookupsLoading = false }) {
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
      <Form.Item name="address" label={t("fieldAddress")} rules={[{ max: 2000, message: t("fieldAddressMax") }]}>
        <Input.TextArea rows={3} autoComplete="off" />
      </Form.Item>
      <Form.Item name="phone" label={t("fieldPhone")} rules={[{ max: 50, message: t("fieldPhoneMax") }]}>
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="email"
        label={t("fieldEmail")}
        rules={[
          { type: "email", message: t("fieldEmailInvalid") },
          { max: 255, message: t("fieldEmailMax") },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="timezone"
        label={t("fieldTimezone")}
        rules={[{ max: 64, message: t("fieldTimezoneMax") }]}
      >
        <Input autoComplete="off" placeholder={t("fieldTimezonePlaceholder")} />
      </Form.Item>
      <Form.Item name="opening_time" label={t("fieldOpeningTime")}>
        <TimePicker className="w-full" format="HH:mm" minuteStep={5} needConfirm={false} />
      </Form.Item>
      <Form.Item name="closing_time" label={t("fieldClosingTime")}>
        <TimePicker className="w-full" format="HH:mm" minuteStep={5} needConfirm={false} />
      </Form.Item>
      <Form.Item name="manager_id" label={t("fieldManager")}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={lookupsLoading}
          options={userOptions}
          placeholder={t("fieldManagerPlaceholder")}
        />
      </Form.Item>
      <Form.Item name="is_active" label={t("fieldStatus")} valuePropName="checked">
        <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
      </Form.Item>
      <Form.Item name="is_default" label={t("fieldDefault")} valuePropName="checked">
        <Switch checkedChildren={t("defaultYes")} unCheckedChildren={t("defaultNo")} />
      </Form.Item>
    </Form>
  );
}
