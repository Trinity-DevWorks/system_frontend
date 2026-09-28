"use client";

import { Form, Input } from "antd";

/**
 * Provision form: workspace name, domain (e.g. `acme.localhost`) and owner credentials.
 *
 * @param {{
 *   form: import("antd").FormInstance;
 *   t: (key: string) => string;
 * }} props
 */
export default function TenantCreateForm({ form, t }) {
  return (
    <Form form={form} layout="vertical" requiredMark="optional">
      <Form.Item
        name="name"
        label={t("fieldName")}
        rules={[
          { required: true, whitespace: true, message: t("fieldNameRequired") },
          { max: 255, message: t("fieldNameMax") },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="domain"
        label={t("fieldDomain")}
        extra={t("fieldDomainHint")}
        rules={[
          { required: true, whitespace: true, message: t("fieldDomainRequired") },
          { max: 255, message: t("fieldDomainMax") },
        ]}
      >
        <Input autoComplete="off" placeholder={t("fieldDomainPlaceholder")} />
      </Form.Item>
      <Form.Item
        name="email"
        label={t("fieldOwnerEmail")}
        extra={t("fieldOwnerEmailHint")}
        rules={[
          { required: true, message: t("fieldOwnerEmailRequired") },
          { type: "email", message: t("fieldOwnerEmailInvalid") },
          { max: 255, message: t("fieldOwnerEmailMax") },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="password"
        label={t("fieldPassword")}
        rules={[
          { required: true, message: t("fieldPasswordRequired") },
          { min: 8, message: t("fieldPasswordMin") },
        ]}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item
        name="password_confirmation"
        label={t("fieldPasswordConfirmation")}
        dependencies={["password"]}
        rules={[
          { required: true, message: t("fieldPasswordConfirmationRequired") },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) return Promise.resolve();
              return Promise.reject(new Error(t("fieldPasswordMismatch")));
            },
          }),
        ]}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
    </Form>
  );
}
