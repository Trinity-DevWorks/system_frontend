"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { Descriptions, Tag, Typography } from "antd";
import { INVOICE_VERIFIER_STATUS_COLORS } from "../../utils/invoiceVerifierDrawerUtils";

/**
 * Read-only wallet and blockchain state; the wallet cannot be edited after create.
 *
 * @param {{
 *   verifier: import("../../api/invoiceVerifiers.api").InvoiceVerifier;
 *   t: (key: string) => string;
 * }} props
 */
export default function InvoiceVerifierChainPanel({ verifier, t }) {
  const mono = (/** @type {string | null} */ value) =>
    value ? (
      <Typography.Text copyable={{ text: value }} className="break-all font-mono text-xs" dir="ltr">
        {value}
      </Typography.Text>
    ) : (
      "\u2014"
    );

  return (
    <Descriptions
      title={t("sectionBlockchain")}
      size="small"
      column={1}
      bordered
      className="mt-2"
      items={[
        {
          key: "wallet",
          label: t("fieldWallet"),
          children: (
            <div className="flex flex-col gap-1">
              {mono(verifier.wallet_address)}
              <span>
                <Tag className="!m-0">{verifier.wallet_type === "safe" ? t("typeSafe") : t("typeWallet")}</Tag>
              </span>
            </div>
          ),
        },
        {
          key: "status",
          label: t("columnStatus"),
          children: (
            <Tag color={INVOICE_VERIFIER_STATUS_COLORS[verifier.chain_status]}>
              {t(`statuses.${verifier.chain_status}`)}
            </Tag>
          ),
        },
        ...(verifier.chain_error
          ? [
              {
                key: "error",
                label: t("chainError"),
                children: <Typography.Text type="danger">{verifier.chain_error}</Typography.Text>,
              },
            ]
          : []),
        { key: "company", label: t("chainCompanyWallet"), children: mono(verifier.chain_company_wallet) },
        { key: "tx", label: t("chainTxHash"), children: mono(verifier.chain_tx_hash) },
        {
          key: "synced",
          label: t("columnSyncedAt"),
          children: formatTenantDateTime(verifier.chain_synced_at) || "\u2014",
        },
      ]}
    />
  );
}
