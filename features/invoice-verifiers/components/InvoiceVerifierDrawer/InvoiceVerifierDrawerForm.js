"use client";

import WalletAddressField from "@/shared/components/inputs/WalletAddressField";
import { Form, Input, Select } from "antd";
import { useEffect } from "react";
import { INVOICE_VERIFIER_ROLES } from "../../utils/invoiceVerifierDrawerUtils";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   readOnly: boolean;
 *   isCreate: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function InvoiceVerifierDrawerForm({ form, readOnly, isCreate, t }) {
  const partySide = Form.useWatch("party_side", form);
  const roles = partySide === "buyer" ? INVOICE_VERIFIER_ROLES.filter((role) => role !== "financier") : INVOICE_VERIFIER_ROLES;

  useEffect(() => {
    if (partySide === "buyer" && form.getFieldValue("role") === "financier") {
      form.setFieldValue("role", undefined);
    }
  }, [form, partySide]);

  return (
    <Form form={form} layout="vertical" requiredMark={readOnly ? false : "optional"} disabled={readOnly}>
      <Form.Item
        name="party_side"
        label={t("fieldActsFor")}
        rules={[{ required: true, message: t("fieldActsForRequired") }]}
      >
        <Select
          disabled={!isCreate}
          options={[
            { value: "supplier", label: t("actsFor.supplier") },
            { value: "buyer", label: t("actsFor.buyer") },
          ]}
        />
      </Form.Item>
      <Form.Item
        name="name"
        label={t("fieldName")}
        rules={[
          { required: true, whitespace: true, message: t("fieldNameRequired") },
          { max: 255, message: t("fieldNameMax") },
        ]}
      >
        <Input autoComplete="off" maxLength={255} />
      </Form.Item>
      <Form.Item name="role" label={t("fieldRole")} rules={[{ required: true, message: t("fieldRoleRequired") }]}>
        <Select options={roles.map((role) => ({ value: role, label: t(`roles.${role}`) }))} />
      </Form.Item>
      {isCreate ? (
        <WalletAddressField
          addressName="wallet_address"
          typeName="wallet_type"
          label={t("fieldWallet")}
          extra={t("fieldWalletHelp")}
          invalidMessage={t("fieldWalletInvalid")}
          required
        />
      ) : null}
      <Form.Item
        name="email"
        label={t("fieldEmail")}
        rules={[
          { type: "email", message: t("fieldEmailInvalid") },
          { max: 255, message: t("fieldEmailMax") },
        ]}
      >
        <Input autoComplete="off" type="email" dir="ltr" />
      </Form.Item>
      <Form.Item name="phone" label={t("fieldPhone")} rules={[{ max: 32, message: t("fieldPhoneMax") }]}>
        <Input autoComplete="off" type="tel" dir="ltr" maxLength={32} />
      </Form.Item>
      <Form.Item name="notes" label={t("fieldNotes")}>
        <Input.TextArea rows={3} maxLength={2000} />
      </Form.Item>
    </Form>
  );
}
