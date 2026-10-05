"use client";

import AuthSplitShell from "@/features/auth/components/AuthSplitShell";
import { invoiceProofStatusTagColor } from "../utils/invoiceProofStatuses";
import { useInvoiceProofPortalQuery } from "../queries/useInvoiceProofPortalQuery";
import { fetchInvoiceProofPortal, recordInvoiceProofDispute, unlockInvoiceProofPortal } from "../api/salesInvoices.api";
import { hasBuyerPortalLinkStamp } from "../utils/invoiceProofPortalUrl";
import { BuyerApprovalError, sendBuyerApproval, sendBuyerDispute } from "@/lib/invoice-registry-buyer-approval";
import { sendBuyerSafeApproval, sendBuyerSafeDispute } from "@/lib/invoice-registry-buyer-safe";
import { signProofPortalUnlock, watchProofPortalAccount } from "@/lib/invoice-proof-portal-unlock";
import { getApiErrorCode, getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { formatTenantDate, formatTenantDateTime, formatTenantMoney, formatTenantNumber } from "@/lib/tenant-format";
import { resolveHostMode } from "@/lib/runtime-mode";
import { useMutation } from "@tanstack/react-query";
import { App, Alert, Button, Input, Modal, Spin, Tag, Tooltip, Typography } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { withLocalePrefix } from "@/lib/locale-path";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * @param {string | null | undefined} value
 */
function isUuid(value) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

/**
 * @param {string} locale
 * @param {unknown} item
 */
function proofPortalHref(locale, item) {
  const id = item && typeof item === "object" && typeof item.id === "string" ? item.id : "";
  const sig = item && typeof item === "object" && typeof item.sig === "string" ? item.sig : "";
  const exp = item && typeof item === "object" ? item.exp : null;
  if (!isUuid(id) || sig === "" || exp == null) return "";
  return `${withLocalePrefix(locale, `/proofs/${id}`)}?${new URLSearchParams({
    exp: String(exp),
    sig,
  })}`;
}

/**
 * @param {{
 *   label: string;
 *   invoice?: unknown;
 *   fallbackNumber?: unknown;
 *   fallbackId?: unknown;
 *   locale: string;
 * }} props
 */
function RelatedInvoiceField({ label, invoice, fallbackNumber, fallbackId, locale }) {
  const number =
    invoice && typeof invoice === "object" && typeof invoice.invoice_number === "string" && invoice.invoice_number !== ""
      ? invoice.invoice_number
      : typeof fallbackNumber === "string" && fallbackNumber !== ""
        ? fallbackNumber
        : "";
  const href = proofPortalHref(locale, invoice);
  const idFallback = typeof fallbackId === "string" && fallbackId !== "" ? fallbackId : "";
  if (!number && !href && !idFallback) return null;

  return (
    <div>
      <div className="text-[var(--ant-color-text-secondary)]">{label}</div>
      {href ? (
        <Typography.Link className="mt-0.5 font-medium" href={href}>
          {number || href}
        </Typography.Link>
      ) : (
        <div
          className={`mt-0.5 font-medium ${!number && idFallback ? "font-mono text-xs" : ""}`}
          dir={!number && idFallback ? "ltr" : undefined}
        >
          {number || idFallback}
        </div>
      )}
    </div>
  );
}

/**
 * @param {string | number | null | undefined} value
 */
function isNonZero(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n !== 0;
}

/**
 * @param {string | number | null | undefined} value
 * @param {string | null | undefined} currencyCode
 */
function moneyWithCurrency(value, currencyCode) {
  const amount = formatTenantMoney(value);
  if (!amount) return "—";
  return [amount, currencyCode].filter(Boolean).join(" ");
}

/**
 * @param {string | number | null | undefined} value
 */
function percentLabel(value) {
  const formatted = formatTenantNumber(value, { decimals: 4, trimTrailingZeros: true });
  return formatted ? `${formatted}%` : "—";
}

/**
 * @param {{
 *   line: {
 *     item_name?: string | null;
 *     description?: string | null;
 *     item_code?: string | null;
 *     quantity?: string;
 *     uom?: string | null;
 *     unit_price?: string;
 *     discount_percent?: string;
 *     tax_rate?: string;
 *     line_total?: string;
 *   };
 *   currencyCode: string | null;
 *   tInvoices: (key: string) => string;
 * }} props
 */
function PortalInvoiceLine({ line, currencyCode, tInvoices }) {
  const qty = formatTenantNumber(line.quantity, { decimals: 6, trimTrailingZeros: true }) || "—";
  const price = formatTenantMoney(line.unit_price) || "—";
  const qtyPrice = line.uom ? `${qty} ${line.uom} × ${price}` : `${qty} × ${price}`;
  const name = typeof line.item_name === "string" ? line.item_name.trim() : "";
  const description = typeof line.description === "string" ? line.description.trim() : "";
  const showDescription = description !== "" && description !== name;

  return (
    <div className="rounded-lg border border-[var(--ant-color-border-secondary)] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-start gap-1 font-medium">
            <span className="break-words">{name || "—"}</span>
            {showDescription ? (
              <Tooltip title={description}>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center text-[var(--ant-color-text-secondary)]"
                  aria-label={description}
                >
                  <QuestionCircleOutlined />
                </button>
              </Tooltip>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-end font-medium whitespace-nowrap">
          {moneyWithCurrency(line.line_total, currencyCode)}
        </div>
      </div>
      <div className="mt-2 text-sm text-[var(--ant-color-text-secondary)]">{qtyPrice}</div>
      {isNonZero(line.discount_percent) || isNonZero(line.tax_rate) ? (
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-[var(--ant-color-text-secondary)]">
          {isNonZero(line.discount_percent) ? (
            <span>
              {tInvoices("lineDiscountPercent")}: {percentLabel(line.discount_percent)}
            </span>
          ) : null}
          {isNonZero(line.tax_rate) ? (
            <span>
              {tInvoices("lineTaxRate")}: {percentLabel(line.tax_rate)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {string | null | undefined} status
 * @param {(key: string) => string} t
 */
function statusHint(t, status) {
  if (status === "waiting_company") return t("hintWaitingCompany");
  if (status === "waiting_buyer") return t("hintWaitingBuyer");
  if (status === "fully_approved") return t("hintFullyApproved");
  if (status === "revoked") return t("hintRevoked");
  if (status === "disputed") return t("hintDisputed");
  if (status === "tampered") return t("hintTampered");
  if (status === "pending_chain") return t("hintPendingChain");
  if (status === "not_registered") return t("hintNotRegistered");
  if (status === "verified") return t("hintVerified");
  return null;
}

/**
 * @param {string | null | undefined} status
 * @param {(key: string) => string} t
 */
function portalStatusLabel(t, status) {
  if (status === "verified") return t("statusVerified");
  if (status === "tampered") return t("statusTampered");
  if (status === "not_registered") return t("statusNotRegistered");
  if (status === "pending_chain") return t("statusPendingChain");
  if (status === "waiting_company") return t("statusWaitingCompany");
  if (status === "waiting_buyer") return t("statusWaitingYou");
  if (status === "fully_approved") return t("statusApproved");
  if (status === "revoked") return t("statusRevoked");
  if (status === "disputed") return t("statusDisputed");
  return status ? String(status) : "—";
}

/**
 * @param {string | null | undefined} hash
 */
/**
 * Block time of a mined approval, as an ISO instant. Matches the chain clock.
 * @param {string} txHash
 * @returns {Promise<string | null>}
 */
async function buyerApprovedAtFromTx(txHash) {
  const ethereum = typeof window !== "undefined" ? window.ethereum : null;
  if (!ethereum || typeof ethereum.request !== "function") return null;

  let receipt = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    receipt = await ethereum.request({ method: "eth_getTransactionReceipt", params: [txHash] });
    if (receipt && typeof receipt === "object") break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  if (!receipt || typeof receipt !== "object" || receipt.status === "0x0") return null;
  const blockNumber = typeof receipt.blockNumber === "string" ? receipt.blockNumber : "";
  if (blockNumber === "") return null;
  const block = await ethereum.request({
    method: "eth_getBlockByNumber",
    params: [blockNumber, false],
  });
  const timestamp = block && typeof block === "object" ? block.timestamp : null;
  const seconds = typeof timestamp === "string" ? Number.parseInt(timestamp, 16) : Number.NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

/**
 * @param {unknown} address
 */
function shortAddress(address) {
  const raw = String(address ?? "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  return `${raw.slice(0, 6)}…${raw.slice(-4)}`;
}

function shortContentHash(hash) {
  const raw = String(hash ?? "")
    .trim()
    .replace(/^0x/i, "")
    .toLowerCase();
  if (!/^[0-9a-f]{12,}$/.test(raw)) return "";
  if (raw.length <= 16) return raw;
  return `${raw.slice(0, 8)}…${raw.slice(-6)}`;
}

/**
 * @param {{
 *   invoiceId: string;
 *   initialHost: string;
 * }} props
 */
function InvoiceProofPortalInner({ invoiceId, initialHost }) {
  const t = useTranslations("InvoiceProofPortal");
  const tInvoices = useTranslations("SalesInvoices");
  const locale = useLocale();
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification } = App.useApp();
  const searchParams = useSearchParams();
  const validId = isUuid(invoiceId) ? invoiceId.trim() : null;
  const portalLink = useMemo(
    () => ({
      exp: searchParams.get("exp"),
      sig: searchParams.get("sig"),
    }),
    [searchParams],
  );
  const hasStamp = hasBuyerPortalLinkStamp(portalLink);
  const portalQuery = useInvoiceProofPortalQuery(validId, portalLink);
  const [invoice, setInvoice] = useState(null);
  const [unlockedBy, setUnlockedBy] = useState(
    /** @type {{ address: string; buyerIsSafe: boolean } | null} */ (null),
  );
  const portalLinkKey = `${validId ?? ""}|${portalLink.exp ?? ""}|${portalLink.sig ?? ""}`;
  const [invoiceLinkKey, setInvoiceLinkKey] = useState(portalLinkKey);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  if (invoiceLinkKey !== portalLinkKey) {
    setInvoiceLinkKey(portalLinkKey);
    setInvoice(null);
  }

  const accountSwitchedMessage = t("accountSwitched");
  const accountSwitchedMessageRef = useRef(accountSwitchedMessage);
  useEffect(() => {
    accountSwitchedMessageRef.current = accountSwitchedMessage;
  }, [accountSwitchedMessage]);

  useEffect(() => {
    if (!invoice || typeof invoice !== "object" || invoice.locked === true) return undefined;

    return watchProofPortalAccount(unlockedBy?.address ?? invoice.buyer_wallet, () => {
      setInvoice(null);
      message.warning({
        content: accountSwitchedMessageRef.current,
        key: "invoice-proof-portal-account-switched",
      });
    });
  }, [invoice, unlockedBy, message]);

  const mode = useMemo(() => resolveHostMode(initialHost), [initialHost]);
  const tenantLabel = mode.tenantSlug
    ? mode.tenantSlug.charAt(0).toUpperCase() + mode.tenantSlug.slice(1)
    : "Your";

  const challenge =
    portalQuery.data && typeof portalQuery.data === "object" && portalQuery.data.locked === true
      ? portalQuery.data
      : null;
  const proof = invoice && typeof invoice === "object" && invoice.locked !== true ? invoice : null;
  const status = typeof proof?.status === "string" ? proof.status : null;
  const hint = statusHint(t, status);
  const errorCode = portalQuery.isError ? getApiErrorCode(portalQuery.error) : null;
  const currencyCode = typeof proof?.currency_code === "string" ? proof.currency_code : null;
  const lines = Array.isArray(proof?.lines) ? proof.lines : [];
  const expectedWallet = typeof challenge?.buyer_wallet === "string" ? challenge.buyer_wallet : "";

  /**
   * @param {unknown} err
   * @param {string} title
   * @param {string} fallback
   */
  function notifyWalletError(err, title, fallback) {
    const code = err instanceof BuyerApprovalError ? err.code : null;
    let description = fallback;
    if (code === "missing_wallet") description = t("walletMissing");
    else if (code === "wallet_mismatch") description = t("walletMismatch");
    else if (code === "wrong_network") description = t("wrongNetwork");
    else if (code === "rejected") description = t("rejected");
    else if (code === "not_safe_owner") description = t("notSafeOwner");
    else if (code === "pending_confirmations") description = t("pendingConfirmations");
    else description = getLocalizedApiErrorMessage(tApiErrors, err) || fallback;
    notification.error({ title, description });
  }

  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (validId == null) throw new BuyerApprovalError("failed");
      const fresh = await fetchInvoiceProofPortal(validId, portalLink);
      const buyerWallet = typeof fresh?.buyer_wallet === "string" ? fresh.buyer_wallet : "";
      const messageToSign = typeof fresh?.message === "string" ? fresh.message : "";
      if (fresh?.locked !== true || buyerWallet === "" || messageToSign === "") {
        throw new BuyerApprovalError("failed");
      }
      const signed = await signProofPortalUnlock({
        buyerWallet,
        chainId: Number(fresh?.chain_id),
        message: messageToSign,
      });
      const result = await unlockInvoiceProofPortal(validId, portalLink, signed);
      return { result, signed };
    },
    onError: (err) => notifyWalletError(err, t("unlockError"), t("unlockError")),
    onSuccess: ({ result, signed }) => {
      if (result && typeof result === "object" && result.locked !== true) {
        setUnlockedBy({ address: signed.address, buyerIsSafe: signed.buyerIsSafe });
        setInvoice(result);
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (validId == null) throw new BuyerApprovalError("failed");
      const chainId = Number(proof?.chain_id);
      const contractAddress = typeof proof?.contract_address === "string" ? proof.contract_address : "";
      const buyerWallet = typeof proof?.buyer_wallet === "string" ? proof.buyer_wallet : "";
      const eip712 = proof?.eip712 && typeof proof.eip712 === "object" ? proof.eip712 : null;
      if (!Number.isFinite(chainId) || chainId <= 0 || contractAddress === "" || buyerWallet === "" || eip712 == null) {
        throw new BuyerApprovalError("failed");
      }
      if (unlockedBy?.buyerIsSafe) {
        const sent = await sendBuyerSafeApproval({ chainId, contractAddress, buyerWallet, eip712 });
        if (sent.status === "proposed") return { proposed: true, buyerApprovedAt: null };
        return { proposed: false, buyerApprovedAt: await buyerApprovedAtFromTx(sent.txHash) };
      }
      const txHash = await sendBuyerApproval({ chainId, contractAddress, buyerWallet, eip712 });
      return { proposed: false, buyerApprovedAt: await buyerApprovedAtFromTx(txHash) };
    },
    onError: (err) => notifyWalletError(err, t("approveError"), t("approveError")),
    onSuccess: ({ proposed, buyerApprovedAt }) => {
      if (proposed) {
        message.info(t("approveSafeProposed"));
        return;
      }
      message.success(t("approveSuccess"));
      setDisputeOpen(false);
      setDisputeReason("");
      setInvoice((current) =>
        current && typeof current === "object"
          ? {
              ...current,
              status: "fully_approved",
              can_approve_as_buyer: false,
              can_dispute_as_buyer: false,
              eip712: null,
              dispute_eip712: null,
              buyer_approved_at:
                typeof buyerApprovedAt === "string" && buyerApprovedAt !== ""
                  ? buyerApprovedAt
                  : current.buyer_approved_at,
            }
          : current,
      );
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (validId == null) throw new BuyerApprovalError("failed");
      const reason = disputeReason.trim();
      if (reason === "") throw new BuyerApprovalError("failed");
      const chainId = Number(proof?.chain_id);
      const contractAddress = typeof proof?.contract_address === "string" ? proof.contract_address : "";
      const buyerWallet = typeof proof?.buyer_wallet === "string" ? proof.buyer_wallet : "";
      const eip712 = proof?.dispute_eip712 && typeof proof.dispute_eip712 === "object" ? proof.dispute_eip712 : null;
      if (!Number.isFinite(chainId) || chainId <= 0 || contractAddress === "" || buyerWallet === "" || eip712 == null) {
        throw new BuyerApprovalError("failed");
      }
      let txHash = "";
      if (unlockedBy?.buyerIsSafe) {
        const sent = await sendBuyerSafeDispute({ chainId, contractAddress, buyerWallet, eip712, reason });
        if (sent.status === "proposed") return { proposed: true, result: null };
        txHash = sent.txHash;
      } else {
        txHash = await sendBuyerDispute({ chainId, contractAddress, buyerWallet, eip712, reason });
      }
      const result = await recordInvoiceProofDispute(validId, portalLink, { reason, tx_hash: txHash });
      return { proposed: false, result };
    },
    onError: (err) => notifyWalletError(err, t("disputeError"), t("disputeError")),
    onSuccess: ({ proposed, result }) => {
      if (proposed) {
        message.info(t("disputeSafeProposed"));
        return;
      }
      message.success(t("disputeSuccess"));
      setDisputeOpen(false);
      setDisputeReason("");
      if (result && typeof result === "object") setInvoice(result);
    },
  });

  async function refreshPortal() {
    if (proof) {
      unlockMutation.mutate();
      return;
    }
    await portalQuery.refetch();
  }

  let body;
  if (!validId || !hasStamp || errorCode === "NOT_FOUND" || errorCode === "PROOF_LINK_INVALID") {
    body = (
      <Alert type="error" showIcon title={t("notFoundTitle")} description={t("notFound")} />
    );
  } else if (errorCode === "PROOF_LINK_EXPIRED") {
    body = (
      <Alert type="warning" showIcon title={t("linkExpiredTitle")} description={t("linkExpired")} />
    );
  } else if (errorCode === "INVOICE_PROOFS_DISABLED") {
    body = (
      <Alert type="warning" showIcon title={t("disabledTitle")} description={t("disabled")} />
    );
  } else if (portalQuery.isError) {
    body = (
      <Alert
        type="error"
        showIcon
        title={t("loadError")}
        description={getLocalizedApiErrorMessage(tApiErrors, portalQuery.error) || t("loadError")}
      />
    );
  } else if (portalQuery.isLoading || (!proof && !challenge)) {
    body = (
      <div className="flex justify-center py-10">
        <Spin />
      </div>
    );
  } else if (!proof && challenge) {
    body = (
      <>
        <div className="mb-6 text-center">
          <Typography.Title
            level={3}
            className="!mb-1 !mt-0 !text-2xl !font-bold !leading-snug !tracking-tight !text-[var(--ant-color-text)]"
          >
            {t("unlockTitle")}
          </Typography.Title>
          <Typography.Paragraph className="!mb-0 !text-sm !text-[var(--ant-color-text-secondary)]">
            {t("unlockSubtitle")}
          </Typography.Paragraph>
        </div>
        {expectedWallet === "" ? (
          <Alert type="warning" showIcon title={t("walletRequiredTitle")} description={t("walletRequired")} />
        ) : (
          <>
            <Alert type="info" showIcon title={t("unlockHint")} />
            <div className="mt-4 text-sm">
              <div className="text-[var(--ant-color-text-secondary)]">{t("expectedWallet")}</div>
              <div className="mt-1 break-all font-mono" dir="ltr">
                {expectedWallet}
              </div>
              <div className="mt-1 text-xs text-[var(--ant-color-text-secondary)]">
                {challenge?.buyer_wallet_type === "safe"
                  ? t("buyerSafeHint")
                  : challenge?.buyer_wallet_type === "wallet"
                    ? t("buyerWalletHint")
                    : t("safeOwnerHint")}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                type="primary"
                loading={unlockMutation.isPending}
                onClick={() => unlockMutation.mutate()}
              >
                {t("connect")}
              </Button>
            </div>
          </>
        )}
      </>
    );
  } else {
    const alertType =
      status === "tampered"
        ? "error"
        : status === "revoked" || status === "disputed"
          ? "warning"
          : status === "fully_approved"
            ? "success"
            : "info";
    const fullHash =
      typeof proof.content_hash === "string" ? proof.content_hash.toLowerCase() : "";
    const shortHash = shortContentHash(fullHash);
    body = (
      <>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-[var(--ant-color-text-secondary)]">
              {proof.company_name || t("title")}
            </div>
            <h2 className="m-0 mt-1 text-2xl font-bold leading-tight tracking-tight">
              {proof.invoice_number || "—"}
            </h2>
            <div className="mt-1 text-sm text-[var(--ant-color-text-secondary)]">
              {formatTenantDate(proof.invoice_date) || "—"}
              {proof.customer_name ? ` · ${proof.customer_name}` : ""}
            </div>
          </div>
          {status ? (
            <Tag className="mt-1 shrink-0" color={invoiceProofStatusTagColor(status)}>
              {portalStatusLabel(t, status)}
            </Tag>
          ) : null}
        </div>
        <div className="mb-6 flex flex-col gap-5">
          {hint ? (
            <Alert type={alertType} showIcon title={hint} />
          ) : null}
          <div className="grid grid-cols-1 gap-3 rounded-xl bg-[var(--ant-color-fill-quaternary)] px-4 py-3 text-sm sm:grid-cols-2">
            {proof.due_on ? (
              <div>
                <div className="text-[var(--ant-color-text-secondary)]">{t("dueOn")}</div>
                <div className="mt-0.5 font-medium">{formatTenantDate(proof.due_on) || "—"}</div>
              </div>
            ) : null}
            {typeof proof.registered_at === "string" && proof.registered_at !== "" ? (
              <div>
                <div className="text-[var(--ant-color-text-secondary)]">{t("chainRegisteredAt")}</div>
                <div className="mt-0.5 font-medium">{formatTenantDateTime(proof.registered_at) || "—"}</div>
              </div>
            ) : null}
            <div>
              <div className="text-[var(--ant-color-text-secondary)]">{t("chainSupplierApprovedAt")}</div>
              <div className="mt-0.5 font-medium">{formatTenantDateTime(proof.supplier_approved_at) || "—"}</div>
              {formatTenantDateTime(proof.supplier_approved_at) && shortAddress(proof.supplier_wallet) ? (
                <p className="mb-0 mt-0.5 font-mono text-xs text-[var(--ant-color-text-secondary)]" dir="ltr">
                  <Tooltip title={String(proof.supplier_wallet)}>
                    <span className="cursor-help break-all">{shortAddress(proof.supplier_wallet)}</span>
                  </Tooltip>
                </p>
              ) : null}
            </div>
            <div>
              <div className="text-[var(--ant-color-text-secondary)]">{t("chainBuyerApprovedAt")}</div>
              <div className="mt-0.5 font-medium">{formatTenantDateTime(proof.buyer_approved_at) || "—"}</div>
              {formatTenantDateTime(proof.buyer_approved_at) && shortAddress(proof.buyer_wallet) ? (
                <p className="mb-0 mt-0.5 font-mono text-xs text-[var(--ant-color-text-secondary)]" dir="ltr">
                  <Tooltip title={String(proof.buyer_wallet)}>
                    <span className="cursor-help break-all">{shortAddress(proof.buyer_wallet)}</span>
                  </Tooltip>
                </p>
              ) : null}
            </div>
            {formatTenantDateTime(proof.financed_at) ? (
              <div>
                <div className="flex items-center gap-1 text-[var(--ant-color-text-secondary)]">
                  {t("financedAt")}
                  <Tooltip title={t("financedHint")}>
                    <QuestionCircleOutlined className="cursor-help" aria-label={t("financedHint")} />
                  </Tooltip>
                </div>
                <div className="mt-0.5 font-medium">{formatTenantDateTime(proof.financed_at)}</div>
              </div>
            ) : null}
            {formatTenantDateTime(proof.revoked_at) ? (
              <div>
                <div className="text-[var(--ant-color-text-secondary)]">{t("revokedAt")}</div>
                <div className="mt-0.5 font-medium">{formatTenantDateTime(proof.revoked_at)}</div>
              </div>
            ) : null}
            <RelatedInvoiceField
              label={tInvoices("replacesInvoice")}
              invoice={proof.replaces_invoice}
              locale={locale}
            />
            <RelatedInvoiceField
              label={t("replacedBy")}
              invoice={proof.replaced_by_invoice}
              fallbackNumber={proof.replaced_by_invoice_number}
              fallbackId={proof.replaced_by}
              locale={locale}
            />
            {formatTenantDateTime(proof.disputed_at) ? (
              <div>
                <div className="text-[var(--ant-color-text-secondary)]">{t("disputedAt")}</div>
                <div className="mt-0.5 font-medium">{formatTenantDateTime(proof.disputed_at)}</div>
              </div>
            ) : null}
            {typeof proof.dispute_reason === "string" && proof.dispute_reason !== "" ? (
              <div className="sm:col-span-2">
                <div className="text-[var(--ant-color-text-secondary)]">{t("disputeReason")}</div>
                <div className="mt-0.5 font-medium whitespace-pre-wrap">{proof.dispute_reason}</div>
              </div>
            ) : null}
          </div>
          <div>
            <Typography.Text className="mb-2 block font-medium">{t("lines")}</Typography.Text>
            {lines.length === 0 ? (
              <div className="text-sm text-[var(--ant-color-text-secondary)]">—</div>
            ) : (
              <div className="flex flex-col gap-2">
                {lines.map((line, index) => (
                  <PortalInvoiceLine
                    key={String(index)}
                    line={line}
                    currencyCode={currencyCode}
                    tInvoices={tInvoices}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="ms-auto w-full max-w-sm space-y-2 rounded-xl border border-[var(--ant-color-border-secondary)] px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[var(--ant-color-text-secondary)]">{tInvoices("totalSubtotal")}</span>
              <span>{moneyWithCurrency(proof.subtotal, currencyCode)}</span>
            </div>
            {isNonZero(proof.discount_total) ? (
              <div className="flex justify-between gap-4">
                <span className="text-[var(--ant-color-text-secondary)]">{tInvoices("totalDiscount")}</span>
                <span>{moneyWithCurrency(proof.discount_total, currencyCode)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <span className="text-[var(--ant-color-text-secondary)]">{tInvoices("totalTax")}</span>
              <span>{moneyWithCurrency(proof.tax_total, currencyCode)}</span>
            </div>
            {isNonZero(proof.adjustment) ? (
              <div className="flex justify-between gap-4">
                <span className="text-[var(--ant-color-text-secondary)]">{tInvoices("totalAdjustment")}</span>
                <span>{moneyWithCurrency(proof.adjustment, currencyCode)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 font-semibold">
              <span>{t("grandTotal")}</span>
              <span>{moneyWithCurrency(proof.grand_total, currencyCode)}</span>
            </div>
            {isNonZero(proof.net_to_pay) && String(proof.net_to_pay) !== String(proof.grand_total) ? (
              <div className="flex justify-between gap-4">
                <span className="text-[var(--ant-color-text-secondary)]">{tInvoices("totalNetToPay")}</span>
                <span>{moneyWithCurrency(proof.net_to_pay, currencyCode)}</span>
              </div>
            ) : null}
          </div>
        </div>
        {shortHash ? (
          <div className="mb-4 text-sm text-[var(--ant-color-text-secondary)]">
            <p className="mb-1">
              {t("bindingNotice", {
                number: proof.invoice_number || "—",
                date: formatTenantDate(proof.invoice_date) || "—",
              })}
            </p>
            <p className="mb-0 font-mono" dir="ltr">
              {t("sealLabel")}{" "}
              <Tooltip title={fullHash}>
                <span className="cursor-help break-all">{shortHash}</span>
              </Tooltip>
            </p>
          </div>
        ) : null}
        {Array.isArray(proof.other_invoices) && proof.other_invoices.length > 0 ? (
          <div className="mb-6">
            <Typography.Text className="mb-2 block font-medium">{t("historyOther")}</Typography.Text>
            <div className="flex flex-col gap-2">
              {proof.other_invoices.map((item) => {
                const id = typeof item?.id === "string" ? item.id : "";
                const href = proofPortalHref(locale, item);
                return (
                  <a
                    key={id || href || item.invoice_number}
                    href={href || undefined}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ant-color-border-secondary)] px-3 py-2 text-sm text-inherit no-underline transition-colors hover:bg-[var(--ant-color-fill-quaternary)]"
                  >
                    <span>
                      {item.invoice_number || "—"}
                      {" · "}
                      {formatTenantDate(item.invoice_date) || "—"}
                    </span>
                    <span>{t("historyOpen")}</span>
                  </a>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="mt-2 flex flex-col-reverse gap-3 border-t border-[var(--ant-color-border-secondary)] pt-4 sm:flex-row sm:justify-end">
          <Button onClick={() => void refreshPortal()} loading={portalQuery.isFetching || unlockMutation.isPending}>
            {t("refresh")}
          </Button>
          {proof.can_dispute_as_buyer ? (
            <Button
              danger
              loading={disputeMutation.isPending}
              onClick={() => setDisputeOpen(true)}
            >
              {t("dispute")}
            </Button>
          ) : null}
          {proof.can_approve_as_buyer ? (
            <Button
              type="primary"
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              {t("approve")}
            </Button>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <AuthSplitShell isCentral={mode.isCentral} tenantLabel={tenantLabel} scrollable documentLayout>
      {body}
      <Modal
        title={t("disputeTitle")}
        open={disputeOpen}
        onCancel={() => setDisputeOpen(false)}
        okText={t("disputeConfirm")}
        confirmLoading={disputeMutation.isPending}
        okButtonProps={{ danger: true, disabled: disputeReason.trim() === "" }}
        onOk={() => disputeMutation.mutate()}
      >
        <Typography.Paragraph className="!mb-3">{t("disputeHint")}</Typography.Paragraph>
        <Input.TextArea
          value={disputeReason}
          onChange={(event) => setDisputeReason(event.target.value)}
          rows={4}
          maxLength={2000}
          showCount
          placeholder={t("disputeReasonPlaceholder")}
        />
      </Modal>
    </AuthSplitShell>
  );
}

/**
 * @param {{
 *   invoiceId: string;
 *   initialHost: string;
 * }} props
 */
export default function InvoiceProofPortalPage({ invoiceId, initialHost }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <InvoiceProofPortalInner invoiceId={invoiceId} initialHost={initialHost} />
    </App>
  );
}
