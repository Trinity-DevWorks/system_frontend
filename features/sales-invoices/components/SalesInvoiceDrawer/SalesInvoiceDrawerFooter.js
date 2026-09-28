"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { postedByDisplayName } from "./SalesInvoiceDrawerHeaderMeta";
import {
  getInvoiceProofStatusLabel,
  invoiceProofStatusTagColor,
} from "../../utils/invoiceProofStatuses";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { Button, Space, Tag, Tooltip } from "antd";
import SalesInvoiceBuyerLinkButton from "./SalesInvoiceBuyerLinkButton";
import SalesInvoiceProofDisclosureButton from "./SalesInvoiceProofDisclosureButton";

/**
 * @param {{
 *   t: (key: string) => string;
 *   postedBy?: unknown;
 *   postedAt?: string | null;
 * }} props
 */
/**
 * @param {unknown} address
 */
function shortAddress(address) {
  const raw = String(address ?? "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  return `${raw.slice(0, 6)}…${raw.slice(-4)}`;
}

const ATTESTATION_LABEL_KEYS = {
  auditor: "chainAttestedAuditor",
  tax_authority: "chainAttestedTaxAuthority",
  financier: "chainAttestedFinancier",
};

function FooterChainTimes({
  t,
  registeredAt,
  supplierApprovedAt,
  buyerApprovedAt,
  supplierWallet,
  buyerWallet,
  attestations = [],
}) {
  const items = [
    [registeredAt, "chainRegisteredAt", "", "chainRegisteredAt"],
    [supplierApprovedAt, "chainSupplierApprovedAt", supplierWallet, "chainSupplierApprovedAt"],
    [buyerApprovedAt, "chainBuyerApprovedAt", buyerWallet, "chainBuyerApprovedAt"],
    ...attestations
      .filter((attestation) => ATTESTATION_LABEL_KEYS[attestation?.role])
      .map((attestation) => [
        attestation.attested_at,
        ATTESTATION_LABEL_KEYS[attestation.role],
        attestation.verifier,
        `attestation-${attestation.verifier}`,
        attestation.verifier_name,
      ]),
  ].filter(([value]) => typeof value === "string" && value !== "");
  if (items.length === 0) return null;

  return (
    <div className="sales-invoice-drawer-footer-posted">
      {items.map(([value, key, wallet, itemKey, name]) => {
        const when = formatTenantDateTime(value) || "\u2014";
        const label = typeof name === "string" ? name.trim() : "";
        const who = label || shortAddress(wallet);
        return (
          <span key={itemKey} className="sales-invoice-drawer-footer-posted-item">
            <span className="sales-invoice-drawer-footer-posted-label">{t(key)}</span>
            <span className="sales-invoice-drawer-footer-posted-value">
              {when}
              {who ? (
                <Tooltip title={String(wallet)}>
                  {label ? (
                    <span className="ms-1 cursor-help text-xs">{who}</span>
                  ) : (
                    <span className="ms-1 cursor-help font-mono text-xs" dir="ltr">
                      {who}
                    </span>
                  )}
                </Tooltip>
              ) : null}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function FooterPostedMeta({ t, postedBy, postedAt }) {
  return (
    <div className="sales-invoice-drawer-footer-posted">
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedBy")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {postedByDisplayName(postedBy) || "\u2014"}
        </span>
      </span>
      <span className="sales-invoice-drawer-footer-posted-item">
        <span className="sales-invoice-drawer-footer-posted-label">{t("fieldPostedOn")}</span>
        <span className="sales-invoice-drawer-footer-posted-value">
          {formatTenantDateTime(postedAt) || "\u2014"}
        </span>
      </span>
    </div>
  );
}

/**
 * @param {{
 *   readOnly: boolean;
 *   t: (key: string) => string;
 *   forceClose: () => void;
 *   requestClose: () => void;
 *   submitting: boolean;
 *   saveDisabled: boolean;
 *   postDisabled: boolean;
 *   showDelete: boolean;
 *   showReverse?: boolean;
 *   postedBy?: unknown;
 *   postedAt?: string | null;
 *   showVerify?: boolean;
 *   verifying?: boolean;
 *   proofStatus?: string | null;
 *   chainRegisteredAt?: string | null;
 *   chainSupplierApprovedAt?: string | null;
 *   chainBuyerApprovedAt?: string | null;
 *   chainSupplierWallet?: string | null;
 *   chainBuyerWallet?: string | null;
 *   chainAttestations?: Array<{ verifier: string; role: string; attested_at: string | null }>;
 *   showApproveCompany?: boolean;
 *   approvingCompany?: boolean;
 *   showBuyerLink?: boolean;
 *   buyerLinkInvoiceId?: string | null;
 *   buyerLinkInvoiceNumber?: string | null;
 *   onSave: () => void;
 *   onPost: () => void;
 *   onDelete: () => void;
 *   onReverse?: () => void;
 *   onVerify?: () => void;
 *   onApproveCompany?: () => void;
 * }} props
 */
export default function SalesInvoiceDrawerFooter({
  readOnly,
  t,
  forceClose,
  requestClose,
  submitting,
  saveDisabled,
  postDisabled,
  showDelete,
  showReverse = false,
  postedBy = null,
  postedAt = null,
  showVerify = false,
  verifying = false,
  proofStatus = null,
  chainRegisteredAt = null,
  chainSupplierApprovedAt = null,
  chainBuyerApprovedAt = null,
  chainSupplierWallet = null,
  chainBuyerWallet = null,
  chainAttestations = [],
  showApproveCompany = false,
  approvingCompany = false,
  showBuyerLink = false,
  buyerLinkInvoiceId = null,
  buyerLinkInvoiceNumber = null,
  onSave,
  onPost,
  onDelete,
  onReverse,
  onVerify,
  onApproveCompany,
}) {
  useDrawerSubmitShortcut({
    enabled: !readOnly,
    submitting,
    onSave,
    saveDisabled,
    onPost,
    postDisabled,
  });

  const verifyControls =
    showVerify || showApproveCompany ? (
      <>
        {showVerify && proofStatus ? (
          <Tag className="shrink-0" color={invoiceProofStatusTagColor(proofStatus)}>
            {getInvoiceProofStatusLabel(t, proofStatus)}
          </Tag>
        ) : null}
        {showVerify ? (
          <Button className="shrink-0" loading={verifying} disabled={submitting} onClick={onVerify}>
            {t("actionVerify")}
          </Button>
        ) : null}
        {showApproveCompany ? (
          <Button
            className="shrink-0"
            type="primary"
            loading={approvingCompany}
            disabled={submitting}
            onClick={onApproveCompany}
          >
            {t("actionApproveAsCompany")}
          </Button>
        ) : null}
        {showVerify && showBuyerLink && buyerLinkInvoiceId ? (
          <SalesInvoiceBuyerLinkButton
            invoiceId={buyerLinkInvoiceId}
            invoiceNumber={buyerLinkInvoiceNumber}
            disabled={submitting}
            t={t}
          />
        ) : null}
        {showVerify && showBuyerLink && buyerLinkInvoiceId ? (
          <SalesInvoiceProofDisclosureButton
            invoiceId={buyerLinkInvoiceId}
            invoiceNumber={buyerLinkInvoiceNumber}
            disabled={submitting}
          />
        ) : null}
      </>
    ) : null;

  if (readOnly) {
    return (
      <div className="flex w-full min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <FooterPostedMeta t={t} postedBy={postedBy} postedAt={postedAt} />
          {showVerify ? (
            <FooterChainTimes
              t={t}
              registeredAt={chainRegisteredAt}
              supplierApprovedAt={chainSupplierApprovedAt}
              buyerApprovedAt={chainBuyerApprovedAt}
              supplierWallet={chainSupplierWallet}
              buyerWallet={chainBuyerWallet}
              attestations={chainAttestations}
            />
          ) : null}
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-3">
          {verifyControls}
          <Button className="shrink-0" onClick={forceClose}>
            {t("drawerClose")}
          </Button>
          {showReverse ? (
            <Button className="shrink-0" danger disabled={submitting} loading={submitting} onClick={onReverse}>
              {t("actionReverse")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <FooterPostedMeta t={t} postedBy={postedBy} postedAt={postedAt} />
        {showVerify ? (
          <FooterChainTimes
            t={t}
            registeredAt={chainRegisteredAt}
            supplierApprovedAt={chainSupplierApprovedAt}
            buyerApprovedAt={chainBuyerApprovedAt}
            supplierWallet={chainSupplierWallet}
            buyerWallet={chainBuyerWallet}
            attestations={chainAttestations}
          />
        ) : null}
      </div>
      {showDelete ? (
        <Button className="shrink-0" danger disabled={submitting} onClick={onDelete}>
          {t("actionDelete")}
        </Button>
      ) : null}
      <Space className="ms-auto shrink-0">
        <Button onClick={requestClose} disabled={submitting}>
          {t("drawerCancel")}
        </Button>
        <Button
          disabled={saveDisabled || submitting}
          loading={submitting}
          onClick={onSave}
          title={`${t("drawerSave")} (Ctrl+Enter)`}
        >
          {t("drawerSave")}
        </Button>
        <Button
          type="primary"
          disabled={postDisabled || submitting}
          loading={submitting}
          onClick={onPost}
          title={`${t("actionPost")} (Ctrl+Shift+Enter)`}
        >
          {t("actionPost")}
        </Button>
      </Space>
    </div>
  );
}
