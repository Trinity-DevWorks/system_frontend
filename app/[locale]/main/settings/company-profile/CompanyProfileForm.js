"use client";

import { Form, Input } from "antd";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   t: (key: string) => string;
 *   onFinish: (values: Record<string, unknown>) => void;
 * }} props
 */
export default function CompanyProfileForm({ form, t, onFinish }) {
  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark="optional"
      className="max-w-2xl"
      onFinish={onFinish}
    >
      <Form.Item
        name="company_name"
        label={t("fieldCompanyName")}
        rules={[
          { required: true, message: t("fieldCompanyNameRequired") },
          { max: 255, message: t("fieldCompanyNameMax") },
        ]}
      >
        <Input autoComplete="organization" />
      </Form.Item>
      <Form.Item
        name="legal_name"
        label={t("fieldLegalName")}
        rules={[{ max: 255, message: t("fieldLegalNameMax") }]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="phone"
          label={t("fieldPhone")}
          rules={[{ max: 32, message: t("fieldPhoneMax") }]}
        >
          <Input autoComplete="tel" />
        </Form.Item>
        <Form.Item
          name="email"
          label={t("fieldEmail")}
          rules={[
            { type: "email", message: t("fieldEmailInvalid") },
            { max: 255, message: t("fieldEmailMax") },
          ]}
        >
          <Input autoComplete="email" />
        </Form.Item>
      </div>
      <Form.Item
        name="website"
        label={t("fieldWebsite")}
        rules={[{ max: 255, message: t("fieldWebsiteMax") }]}
      >
        <Input autoComplete="url" placeholder={t("fieldWebsitePlaceholder")} />
      </Form.Item>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="tax_number"
          label={t("fieldTaxNumber")}
          rules={[{ max: 64, message: t("fieldTaxNumberMax") }]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="registration_number"
          label={t("fieldRegistrationNumber")}
          rules={[{ max: 64, message: t("fieldRegistrationNumberMax") }]}
        >
          <Input autoComplete="off" />
        </Form.Item>
      </div>
      <Form.Item name="address" label={t("fieldAddress")}>
        <Input.TextArea rows={3} autoComplete="street-address" />
      </Form.Item>
    </Form>
  );
}
