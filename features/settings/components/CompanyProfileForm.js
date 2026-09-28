"use client";

import { Form, Input } from "antd";
import WalletAddressField from "@/shared/components/inputs/WalletAddressField";

/**
 * @param {{
 *   form: import("antd").FormInstance;
 *   t: (key: string) => string;
 *   onFinish: (values: Record<string, unknown>) => void;
 *   disabled?: boolean;
 *   onValuesChange?: () => void;
 *   showWalletAddress?: boolean;
 *   blockchainNetwork?: string | null;
 * }} props
 */
export default function CompanyProfileForm({
  form,
  t,
  onFinish,
  disabled = false,
  onValuesChange,
  showWalletAddress = false,
  blockchainNetwork = null,
}) {
  const blockchainNetworkLabel =
    blockchainNetwork === "sepolia" ? t("networkSepolia") : t("networkAnvil");
  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={disabled ? false : "optional"}
      disabled={disabled}
      onFinish={onFinish}
      onValuesChange={onValuesChange}
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
      {showWalletAddress ? (
        <>
          {blockchainNetwork ? (
            <p className="mb-3 text-sm text-neutral-500">
              {t("fieldWalletActiveNetwork", { network: blockchainNetworkLabel })}
            </p>
          ) : null}
          <WalletAddressField
            addressName="wallet_address_anvil"
            typeName="wallet_type_anvil"
            label={t("fieldWalletAddressAnvil")}
            extra={t("fieldWalletAddressAnvilHelp")}
            invalidMessage={t("fieldWalletAddressInvalid")}
            inspect={blockchainNetwork !== "sepolia"}
          />
          <WalletAddressField
            addressName="wallet_address_sepolia"
            typeName="wallet_type_sepolia"
            label={t("fieldWalletAddressSepolia")}
            extra={t("fieldWalletAddressSepoliaHelp")}
            invalidMessage={t("fieldWalletAddressInvalid")}
            inspect={blockchainNetwork === "sepolia"}
          />
        </>
      ) : null}
    </Form>
  );
}
