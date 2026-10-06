"use client";

import { formatTenantDateTime } from "@/lib/tenant-format";
import { postedByDisplayName } from "./SalesInvoiceDrawerHeaderMeta";
import {
  getInvoiceProofStatusLabel,
  invoiceProofStatusTagColor,
} from "../../utils/invoiceProofStatuses";
import { useDrawerSubmitShortcut } from "@/shared/components/resource-drawer/useDrawerSubmitShortcut";
import { DownOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space, Tag, Tooltip, Typography } from "antd";
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
  disputedAt,
  supplierWallet,
  buyerWallet,
  attestations = [],
}) {
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

function FooterDisputeReason({ t, reason }) {
  if (typeof reason !== "string" || reason.trim() === "") return null;

  return (
    <div className="max-w-xl text-xs">
      <span className="font-medium text-[var(--ant-color-text-tertiary)]">{t("chainDisputeReason")}</span>
      <div className="whitespace-pre-wrap font-semibold text-[var(--ant-color-text)]">{reason}</div>
    </div>
  );
}

/**
 * @param {{ hint: { text: string; actionLabel?: string; onAction?: () => void } | null }} props
 */
function FooterProofHint({ hint }) {
  if (!hint) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs">
      <Typography.Text type="warning" className="min-w-0 text-xs">
        <WarningOutlined className="me-1" />
        {hint.text}
      </Typography.Text>
      {hint.onAction ? (
        <Button size="small" type="link" className="shrink-0 !px-0 text-xs" onClick={hint.onAction}>
          {hint.actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function FooterActionButton({
  label,
  onClick,
  disabled = false,
  disabledReason = "",
  danger = false,
  submitting = false,
}) {
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
  if (!disabled || disabledReason === "") {
    return button;
  }

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
    return <span className="sales-invoice-drawer-footer-posted-value">{number}</span>;
  }
  return (
    <Typography.Link
      className="sales-invoice-drawer-footer-posted-value"
      onClick={() => onOpen(invoice)}
    >
      {number}
    </Typography.Link>
  );
}

function FooterInvoiceLinks({
  t,
  replacesInvoice,
  replacedByInvoice,
  creditNotes = [],
  onOpenRelatedInvoice,
  onOpenCreditNote,
}) {
  const origin =
    replacesInvoice && typeof replacesInvoice === "object" && typeof replacesInvoice.invoice_number === "string"
      ? replacesInvoice.invoice_number
      : "";
  const successor =
    replacedByInvoice && typeof replacedByInvoice === "object" && typeof replacedByInvoice.invoice_number === "string"
      ? replacedByInvoice.invoice_number
      : "";
  const notes = Array.isArray(creditNotes)
    ? creditNotes.filter((note) => note && typeof note.credit_note_number === "string")
    : [];
  if (!origin && !successor && notes.length === 0) return null;

  return (
    <div className="sales-invoice-drawer-footer-posted">
      {origin ? (
        <span className="sales-invoice-drawer-footer-posted-item">
          <span className="sales-invoice-drawer-footer-posted-label">{t("replacesInvoice")}</span>
          <RelatedInvoiceNumber invoice={replacesInvoice} onOpen={onOpenRelatedInvoice} />
        </span>
      ) : null}
      {successor ? (
        <span className="sales-invoice-drawer-footer-posted-item">
          <span className="sales-invoice-drawer-footer-posted-label">{t("replacedByInvoice")}</span>
          <RelatedInvoiceNumber invoice={replacedByInvoice} onOpen={onOpenRelatedInvoice} />
        </span>
      ) : null}
      {notes.map((note) => (
        <span key={String(note.id)} className="sales-invoice-drawer-footer-posted-item">
          <span className="sales-invoice-drawer-footer-posted-label">{t("creditNoteLink")}</span>
          {onOpenCreditNote ? (
            <Typography.Link className="sales-invoice-drawer-footer-posted-value" onClick={() => onOpenCreditNote(note)}>
              {note.credit_note_number}
            </Typography.Link>
          ) : (
            <span className="sales-invoice-drawer-footer-posted-value">{note.credit_note_number}</span>
          )}
        </span>
      ))}
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
 *   reverseDisabled?: boolean;
 *   reverseDisabledReason?: string;
 *   showReissue?: boolean;
 *   reissueDisabled?: boolean;
 *   reissueDisabledReason?: string;
 *   postedBy?: unknown;
 *   postedAt?: string | null;
 *   showVerify?: boolean;
 *   verifying?: boolean;
 *   proofStatus?: string | null;
 *   chainRegisteredAt?: string | null;
 *   chainSupplierApprovedAt?: string | null;
 *   chainBuyerApprovedAt?: string | null;
 *   chainDisputedAt?: string | null;
 *   chainDisputeReason?: string | null;
 *   chainSupplierWallet?: string | null;
 *   chainBuyerWallet?: string | null;
 *   chainAttestations?: Array<{ verifier: string; role: string; attested_at: string | null }>;
 *   companyWalletSaved?: boolean | null;
 *   buyerWalletSaved?: boolean | null;
 *   onOpenCompanyProfile?: () => void;
 *   onOpenBuyer?: () => void;
 *   showApproveCompany?: boolean;
 *   approvingCompany?: boolean;
 *   showBuyerLink?: boolean;
 *   buyerLinkInvoiceId?: string | null;
 *   buyerLinkInvoiceNumber?: string | null;
 *   onSave: () => void;
 *   onPost: (intent?: import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent) => void;
 *   lastPostIntent: import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent;
 *   postIntentLabel: (intent: import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent) => string;
 *   postMenuItems: { key: string; label: string }[];
 *   onDelete: () => void;
 *   onReverse?: () => void;
 *   onReissue?: () => void;
   *   onOpenRelatedInvoice?: (invoice: unknown) => void;
   *   onOpenCreditNote?: (note: unknown) => void;
   *   showCreditNote?: boolean;
   *   creditNoteDisabled?: boolean;
   *   creditNoteDisabledReason?: string;
   *   onCreditNote?: () => void;
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
  reverseDisabled = false,
  reverseDisabledReason = "",
  showReissue = false,
  reissueDisabled = false,
  reissueDisabledReason = "",
  onReissue,
  onOpenRelatedInvoice,
  onOpenCreditNote,
  showCreditNote = false,
  creditNoteDisabled = false,
  creditNoteDisabledReason = "",
  onCreditNote,
  replacesInvoice = null,
  replacedByInvoice = null,
  creditNotes = [],
  postedBy = null,
  postedAt = null,
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
  buyerWalletSaved = null,
  onOpenCompanyProfile,
  onOpenBuyer,
  showApproveCompany = false,
  approvingCompany = false,
  showBuyerLink = false,
  buyerLinkInvoiceId = null,
  buyerLinkInvoiceNumber = null,
  onSave,
  onPost,
  lastPostIntent,
  postIntentLabel,
  postMenuItems,
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

  // null "saved" flags mean still loading: no hint until the ERP side is known.
  let proofHint = null;
  if (proofStatus === "waiting_company" && !chainSupplierWallet && companyWalletSaved !== null) {
    proofHint = companyWalletSaved
      ? { text: t("proofHintCompanyWalletSyncing") }
      : {
          text: t("proofHintCompanyWalletMissing"),
          actionLabel: t("proofActionOpenCompanyProfile"),
          onAction: onOpenCompanyProfile,
        };
  } else if (proofStatus === "waiting_buyer" && !chainBuyerWallet && buyerWalletSaved !== null) {
    proofHint = buyerWalletSaved
      ? { text: t("proofHintBuyerWalletSyncing") }
      : {
          text: t("proofHintBuyerWalletMissing"),
          actionLabel: t("proofActionAddBuyerAddress"),
          onAction: onOpenBuyer,
        };
  }

  const proofTag = proofStatus ? (
    <Tag className="shrink-0" color={invoiceProofStatusTagColor(proofStatus)}>
      {getInvoiceProofStatusLabel(t, proofStatus)}
    </Tag>
  ) : null;

  const verifyControls =
    showVerify || showApproveCompany ? (
      <>
        {showVerify ? proofTag : null}
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
            disabled={submitting || proofStatus === "tampered"}
            disabledReason={proofStatus === "tampered" ? t("shareProofDisabledTampered") : null}
          />
        ) : null}
      </>
    ) : null;

  if (readOnly) {
    return (
      <div className="flex w-full min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <FooterPostedMeta t={t} postedBy={postedBy} postedAt={postedAt} />
          <FooterInvoiceLinks
            t={t}
            replacesInvoice={replacesInvoice}
            replacedByInvoice={replacedByInvoice}
            creditNotes={creditNotes}
            onOpenRelatedInvoice={onOpenRelatedInvoice}
            onOpenCreditNote={onOpenCreditNote}
          />
          {showVerify ? (
            <FooterChainTimes
              t={t}
              registeredAt={chainRegisteredAt}
              supplierApprovedAt={chainSupplierApprovedAt}
              buyerApprovedAt={chainBuyerApprovedAt}
              disputedAt={chainDisputedAt}
              supplierWallet={chainSupplierWallet}
              buyerWallet={chainBuyerWallet}
              attestations={chainAttestations}
            />
          ) : null}
          {showVerify ? <FooterDisputeReason t={t} reason={chainDisputeReason} /> : null}
          {showVerify ? <FooterProofHint hint={proofHint} /> : null}
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-3">
          {verifyControls}
          <Button className="shrink-0" onClick={forceClose}>
            {t("drawerClose")}
          </Button>
          {showCreditNote ? (
            <FooterActionButton
              label={t("actionCreditNote")}
              onClick={onCreditNote}
              disabled={creditNoteDisabled}
              disabledReason={creditNoteDisabledReason}
              submitting={submitting}
            />
          ) : null}
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
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <FooterPostedMeta t={t} postedBy={postedBy} postedAt={postedAt} />
        <FooterInvoiceLinks
          t={t}
          replacesInvoice={replacesInvoice}
          replacedByInvoice={replacedByInvoice}
          creditNotes={creditNotes}
          onOpenRelatedInvoice={onOpenRelatedInvoice}
          onOpenCreditNote={onOpenCreditNote}
        />
        {showVerify ? (
          <FooterChainTimes
            t={t}
            registeredAt={chainRegisteredAt}
            supplierApprovedAt={chainSupplierApprovedAt}
            buyerApprovedAt={chainBuyerApprovedAt}
            disputedAt={chainDisputedAt}
            supplierWallet={chainSupplierWallet}
            buyerWallet={chainBuyerWallet}
            attestations={chainAttestations}
          />
        ) : null}
        {showVerify ? <FooterDisputeReason t={t} reason={chainDisputeReason} /> : null}
        {showVerify ? <FooterProofHint hint={proofHint} /> : null}
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
        <Space.Compact className="rounded-md shadow-sm ring-1 ring-black/10 dark:ring-white/15">
          <Button
            type="primary"
            disabled={postDisabled || submitting}
            loading={submitting}
            onClick={() => onPost(lastPostIntent)}
            title={`${postIntentLabel(lastPostIntent)} (Ctrl+Shift+Enter)`}
          >
            {postIntentLabel(lastPostIntent)}
          </Button>
          <Dropdown
            trigger={["click"]}
            disabled={postDisabled || submitting}
            menu={{
              items: postMenuItems,
              onClick: ({ key }) =>
                onPost(/** @type {import("@/lib/drawer/persistedSaveIntent").DrawerSaveIntent} */ (key)),
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
  );
}
