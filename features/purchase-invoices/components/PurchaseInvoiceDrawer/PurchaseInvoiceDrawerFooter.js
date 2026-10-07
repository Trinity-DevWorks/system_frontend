"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { postedByDisplayName } from "./PurchaseInvoiceDrawerHeaderMeta";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { DownOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Button, Dropdown, Space, Tag, Tooltip, Typography } from "antd";
import SalesInvoiceBuyerLinkButton from "@/features/sales-invoices/components/SalesInvoiceDrawer/SalesInvoiceBuyerLinkButton";
import SalesInvoiceProofDisclosureButton from "@/features/sales-invoices/components/SalesInvoiceDrawer/SalesInvoiceProofDisclosureButton";
import { getPurchaseInvoiceProofStatusLabel, invoiceProofStatusTagColor, shareProofBlockReason } from "@/features/sales-invoices/utils/invoiceProofStatuses";

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

function FooterFact({ label, value, who = "", wallet = "", named = false }) {
  return (
    <span className="sales-invoice-drawer-footer-fact">
      <span className="sales-invoice-drawer-footer-fact-label">{label}</span>
      <span className="sales-invoice-drawer-footer-fact-value">{value}</span>
      {who ? (
        <Tooltip title={String(wallet)}>
          <span
            className={
              named
                ? "sales-invoice-drawer-footer-fact-who"
                : "sales-invoice-drawer-footer-fact-who sales-invoice-drawer-footer-fact-who-mono"
            }
            dir={named ? undefined : "ltr"}
          >
            {who}
          </span>
        </Tooltip>
      ) : null}
    </span>
  );
}

function FooterPostedFacts({ t, postedBy, postedAt }) {
  const name = postedByDisplayName(postedBy);
  const when = formatTenantDateTime(postedAt);
  if (!name && !when) return null;

  return (
    <>
      {name ? <FooterFact label={t("fieldPostedBy")} value={name} /> : null}
      {when ? <FooterFact label={t("fieldPostedOn")} value={when} /> : null}
    </>
  );
}

function FooterChainTimes({
  t,
  tSales,
  registeredAt,
  supplierApprovedAt,
  buyerApprovedAt,
  disputedAt,
  supplierWallet,
  buyerWallet,
  attestations = [],
}) {
  const label = (key) => (typeof t.has === "function" && t.has(key) ? t(key) : tSales(key));
  const items = [
    [registeredAt, "chainRegisteredAt", "", "chainRegisteredAt"],
    [supplierApprovedAt, "chainSupplierApprovedAt", supplierWallet, "chainSupplierApprovedAt"],
    [buyerApprovedAt, "chainBuyerApprovedAt", buyerWallet, "chainBuyerApprovedAt"],
    [disputedAt, "chainDisputedAt", "", "chainDisputedAt"],
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
    <>
      {items.map(([value, key, wallet, itemKey, name]) => {
        const when = formatTenantDateTime(value) || "\u2014";
        const whoName = typeof name === "string" ? name.trim() : "";
        const who = whoName || shortAddress(wallet);
        return (
          <FooterFact
            key={itemKey}
            label={label(key)}
            value={when}
            who={who}
            wallet={wallet}
            named={Boolean(whoName)}
          />
        );
      })}
    </>
  );
}

function FooterDisputeReason({ t, tSales, reason }) {
  if (typeof reason !== "string" || reason.trim() === "") return null;
  const heading = typeof t.has === "function" && t.has("chainDisputeReason") ? t("chainDisputeReason") : tSales("chainDisputeReason");
  return (
    <Alert
      className="invoice-drawer-footer-dispute"
      type="error"
      showIcon
      title={heading}
      description={<span className="whitespace-pre-wrap">{reason.trim()}</span>}
    />
  );
}

function FooterProofHint({ hint }) {
  if (!hint) return null;
  return (
    <div className="invoice-drawer-footer-hint">
      <WarningOutlined />
      <span className="invoice-drawer-footer-hint-text">{hint.text}</span>
      {hint.onAction ? (
        <Button size="small" type="link" className="shrink-0 !px-0" onClick={hint.onAction}>
          {hint.actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function FooterActionButton({ label, onClick, disabled = false, disabledReason = "", danger = false, submitting = false }) {
  const button = (
    <Button
      className="shrink-0"
      danger={danger}
      disabled={disabled || submitting}
      loading={submitting}
      onClick={disabled ? undefined : onClick}
    >
      {label}
    </Button>
  );
  if (!disabled || disabledReason === "") return button;
  return (
    <Tooltip title={disabledReason}>
      <span className="inline-flex shrink-0">{button}</span>
    </Tooltip>
  );
}

function RelatedInvoiceNumber({ invoice, onOpen }) {
  const number =
    invoice && typeof invoice === "object" && typeof invoice.invoice_number === "string"
      ? invoice.invoice_number
      : "";
  if (!number) return null;
  if (!onOpen) {
    return <span className="sales-invoice-drawer-footer-fact-value">{number}</span>;
  }
  return (
    <Typography.Link className="sales-invoice-drawer-footer-fact-value" onClick={() => onOpen(invoice)}>
      {number}
    </Typography.Link>
  );
}

function FooterInvoiceLinks({ t, replacesInvoice, replacedByInvoice, onOpenRelatedInvoice }) {
  const origin =
    replacesInvoice && typeof replacesInvoice === "object" && typeof replacesInvoice.invoice_number === "string"
      ? replacesInvoice.invoice_number
      : "";
  const successor =
    replacedByInvoice && typeof replacedByInvoice === "object" && typeof replacedByInvoice.invoice_number === "string"
      ? replacedByInvoice.invoice_number
      : "";
  if (!origin && !successor) return null;
  return (
    <>
      {origin ? (
        <span className="sales-invoice-drawer-footer-fact">
          <span className="sales-invoice-drawer-footer-fact-label">{t("replacesInvoice")}</span>
          <RelatedInvoiceNumber invoice={replacesInvoice} onOpen={onOpenRelatedInvoice} />
        </span>
      ) : null}
      {successor ? (
        <span className="sales-invoice-drawer-footer-fact">
          <span className="sales-invoice-drawer-footer-fact-label">{t("replacedByInvoice")}</span>
          <RelatedInvoiceNumber invoice={replacedByInvoice} onOpen={onOpenRelatedInvoice} />
        </span>
      ) : null}
    </>
  );
}

export default function PurchaseInvoiceDrawerFooter({
  readOnly,
  t,
  tSales,
  forceClose,
  requestClose,
  submitting,
  saveDisabled,
  postDisabled,
  showDelete,
  showReverse = false,
  reverseDisabled = false,
  reverseDisabledReason = "",
  postedBy = null,
  postedAt = null,
  onSave,
  onPost,
  lastPostIntent = "close",
  postIntentLabel,
  postMenuItems = [],
  onDelete,
  onReverse,
  showVerify = false,
  verifying = false,
  proofStatus = null,
  chainRegisteredAt = null,
  chainSupplierApprovedAt = null,
  chainBuyerApprovedAt = null,
  chainDisputedAt = null,
  chainDisputeReason = null,
  chainSupplierWallet = null,
  chainBuyerWallet = null,
  chainAttestations = [],
  companyWalletSaved = null,
  supplierWalletSaved = null,
  onOpenCompanyProfile,
  onOpenSupplier,
  showApproveBuyer = false,
  approvingBuyer = false,
  onApproveBuyer,
  showDispute = false,
  onDispute,
  showVendorLink = false,
  vendorLinkInvoiceId = null,
  vendorLinkInvoiceNumber = null,
  issueVendorLink,
  vendorAbsoluteUrl,
  fetchProofFields,
  createProofDisclosure,
  showReissue = false,
  reissueDisabled = false,
  reissueDisabledReason = "",
  onReissue,
  onVerify,
  replacesInvoice = null,
  replacedByInvoice = null,
  onOpenRelatedInvoice,
}) {
  useDrawerSubmitShortcut({
    enabled: !readOnly,
    submitting,
    onSave,
    saveDisabled,
    onPost,
    postDisabled,
  });

  let proofHint = null;
  if (proofStatus === "waiting_company" && !chainSupplierWallet && supplierWalletSaved !== null) {
    proofHint = supplierWalletSaved
      ? { text: t("proofHintSupplierWalletSyncing") }
      : {
          text: t("proofHintSupplierWalletMissing"),
          actionLabel: t("proofActionAddSupplierAddress"),
          onAction: onOpenSupplier,
        };
  } else if (proofStatus === "waiting_buyer" && !chainBuyerWallet && companyWalletSaved !== null) {
    proofHint = companyWalletSaved
      ? { text: t("proofHintCompanyWalletSyncing") }
      : {
          text: t("proofHintCompanyWalletMissing"),
          actionLabel: t("proofActionOpenCompanyProfile"),
          onAction: onOpenCompanyProfile,
        };
  }

  const proofTag =
    proofStatus && tSales ? (
      <Tag className="shrink-0" color={invoiceProofStatusTagColor(proofStatus)}>
        {getPurchaseInvoiceProofStatusLabel(t, tSales, proofStatus)}
      </Tag>
    ) : null;

  const proofControls =
    showVerify || showApproveBuyer || showDispute ? (
      <>
        {showVerify ? proofTag : null}
        {showVerify ? (
          <Button className="shrink-0" loading={verifying} disabled={submitting} onClick={onVerify}>
            {t("actionVerify")}
          </Button>
        ) : null}
        {showApproveBuyer ? (
          <Button
            className="shrink-0"
            type="primary"
            loading={approvingBuyer}
            disabled={submitting}
            onClick={onApproveBuyer}
          >
            {t("actionApproveAsBuyer")}
          </Button>
        ) : null}
        {showDispute ? (
          <Button className="shrink-0" danger disabled={submitting} onClick={onDispute}>
            {t("dispute")}
          </Button>
        ) : null}
        {showVerify && showVendorLink && vendorLinkInvoiceId ? (
          <SalesInvoiceBuyerLinkButton
            invoiceId={vendorLinkInvoiceId}
            invoiceNumber={vendorLinkInvoiceNumber}
            disabled={submitting}
            t={t}
            actionLabel={t("actionSupplierLink")}
            issueLink={issueVendorLink}
            absoluteUrl={vendorAbsoluteUrl}
            copySuccessKey="copySupplierLinkSuccess"
            copyErrorKey="copySupplierLinkError"
          />
        ) : null}
        {showVerify && showVendorLink && vendorLinkInvoiceId ? (
          <SalesInvoiceProofDisclosureButton
            invoiceId={vendorLinkInvoiceId}
            invoiceNumber={vendorLinkInvoiceNumber}
            disabled={submitting || shareProofBlockReason(t, proofStatus) != null}
            disabledReason={shareProofBlockReason(t, proofStatus)}
            fetchFields={fetchProofFields}
            createDisclosure={createProofDisclosure}
          />
        ) : null}
      </>
    ) : null;

  const facts = (
    <div className="sales-invoice-drawer-footer-facts">
      <FooterPostedFacts t={t} postedBy={postedBy} postedAt={postedAt} />
      <FooterInvoiceLinks
        t={t}
        replacesInvoice={replacesInvoice}
        replacedByInvoice={replacedByInvoice}
        onOpenRelatedInvoice={onOpenRelatedInvoice}
      />
      {showVerify && tSales ? (
        <FooterChainTimes
          t={t}
          tSales={tSales}
          registeredAt={chainRegisteredAt}
          supplierApprovedAt={chainSupplierApprovedAt}
          buyerApprovedAt={chainBuyerApprovedAt}
          disputedAt={chainDisputedAt}
          supplierWallet={chainSupplierWallet}
          buyerWallet={chainBuyerWallet}
          attestations={chainAttestations}
        />
      ) : null}
    </div>
  );
  const hint = showVerify ? <FooterProofHint hint={proofHint} /> : null;
  const dispute = showVerify && tSales ? <FooterDisputeReason t={t} tSales={tSales} reason={chainDisputeReason} /> : null;

  if (readOnly) {
    return (
      <div className="invoice-drawer-footer">
        <div className="invoice-drawer-footer-row">
          {facts}
          <div className="invoice-drawer-footer-actions">
            {proofControls}
            <Button className="shrink-0" onClick={forceClose}>
              {t("drawerClose")}
            </Button>
            {showReissue ? (
              <FooterActionButton
                label={t("actionReissue")}
                onClick={onReissue}
                disabled={reissueDisabled}
                disabledReason={reissueDisabledReason}
                submitting={submitting}
              />
            ) : null}
            {showReverse ? (
              <FooterActionButton
                label={t("actionReverse")}
                onClick={onReverse}
                disabled={reverseDisabled}
                disabledReason={reverseDisabledReason}
                danger
                submitting={submitting}
              />
            ) : null}
          </div>
        </div>
        {dispute}
        {hint}
      </div>
    );
  }

  return (
    <div className="invoice-drawer-footer">
      <div className="invoice-drawer-footer-row">
        {facts}
        <div className="invoice-drawer-footer-actions">
      {showDelete ? (
        <Button className="shrink-0" danger disabled={submitting} onClick={onDelete}>
          {t("actionDelete")}
        </Button>
      ) : null}
      <Space className="shrink-0">
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
        <Space.Compact className="rounded-md shadow-sm ring-1 ring-black/10 dark:ring-white/15">
          <Button
            type="primary"
            disabled={postDisabled || submitting}
            loading={submitting}
            onClick={() => onPost(lastPostIntent)}
            title={`${(postIntentLabel ? postIntentLabel(lastPostIntent) : t("actionPost"))} (Ctrl+Shift+Enter)`}
          >
            {postIntentLabel ? postIntentLabel(lastPostIntent) : t("actionPost")}
          </Button>
          <Dropdown
            trigger={["click"]}
            disabled={postDisabled || submitting}
            menu={{
              items: postMenuItems,
              onClick: ({ key }) => onPost(key),
            }}
          >
            <Button
              type="primary"
              icon={<DownOutlined />}
              loading={submitting}
              disabled={postDisabled || submitting}
              aria-label={t("actionPostMenu")}
            />
          </Dropdown>
        </Space.Compact>
      </Space>
        </div>
      </div>
      {dispute}
      {hint}
    </div>
  );
}
