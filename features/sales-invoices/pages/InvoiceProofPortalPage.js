"use client";

import AuthSplitShell from "@/features/auth/components/AuthSplitShell";
import { attestationSideLabelKey, visibleAttestations } from "../utils/invoiceAttestationSides";
import { invoiceProofStatusTagColor } from "../utils/invoiceProofStatuses";
import { useInvoiceProofPortalQuery } from "../queries/useInvoiceProofPortalQuery";
import { fetchBuyerPortalInvoicePdf, fetchInvoiceProofPortal, recordInvoiceProofDispute, resumeInvoiceProofPortal, unlockInvoiceProofPortal } from "../api/salesInvoices.api";
import InvoicePdfDownloadButton from "../components/InvoicePdfDownloadButton";
import { hasBuyerPortalLinkStamp } from "../utils/invoiceProofPortalUrl";
import { BuyerApprovalError, sendBuyerApproval, sendBuyerDispute } from "@/lib/invoice-registry-buyer-approval";
import { sendSupplierApproval, sendSupplierDispute } from "@/lib/invoice-registry-supplier-safe";
import {
  fetchPurchaseProofPortal,
  recordPurchaseProofDispute,
  resumePurchaseProofPortal,
  unlockPurchaseProofPortal,
  fetchVendorPortalInvoicePdf,
} from "@/features/purchase-invoices/api/purchaseInvoices.api";
import { sendBuyerSafeApproval, sendBuyerSafeDispute } from "@/lib/invoice-registry-buyer-safe";
import {
  clearPortalSession,
  connectProofPortalAccount,
  readConnectedAccount,
  readPortalSession,
  savePortalSession,
  signProofPortalUnlock,
  watchProofPortalAccount,
} from "@/lib/invoice-proof-portal-unlock";
import { getApiErrorCode, getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { formatTenantDate, formatTenantDateTime, formatTenantMoney, formatTenantNumber } from "@/lib/tenant-format";
import { resolveHostMode } from "@/lib/runtime-mode";
import { useMutation } from "@tanstack/react-query";
import { App, Alert, Button, Input, Modal, Spin, Tabs, Tag, Tooltip, Typography } from "antd";
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
function proofPortalHref(locale, item, basePath = "/proofs/sales") {
  const id = item && typeof item === "object" && typeof item.id === "string" ? item.id : "";
  const sig = item && typeof item === "object" && typeof item.sig === "string" ? item.sig : "";
  const exp = item && typeof item === "object" ? item.exp : null;
  if (!isUuid(id) || sig === "" || exp == null) return "";
  return `${withLocalePrefix(locale, `${basePath}/${id}`)}?${new URLSearchParams({
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
function RelatedInvoiceField({ label, invoice, fallbackNumber, fallbackId, locale, basePath = "/proofs/sales" }) {
  const number =
    invoice && typeof invoice === "object" && typeof invoice.invoice_number === "string" && invoice.invoice_number !== ""
      ? invoice.invoice_number
      : typeof fallbackNumber === "string" && fallbackNumber !== ""
        ? fallbackNumber
        : "";
  const href = proofPortalHref(locale, invoice, basePath);
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
    <div className="grid grid-cols-1 gap-1 border-b border-[var(--ant-color-border-secondary)] px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_8rem_9rem] sm:items-center sm:gap-3">
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
        <div className="mt-1 text-sm text-[var(--ant-color-text-secondary)] sm:hidden">{qtyPrice}</div>
      </div>
      <div className="hidden text-end text-sm sm:block">{line.uom ? `${qty} ${line.uom}` : qty}</div>
      <div className="hidden text-end text-sm sm:block">{price}</div>
      <div className="text-end font-medium whitespace-nowrap">{moneyWithCurrency(line.line_total, currencyCode)}</div>
      {isNonZero(line.discount_percent) || isNonZero(line.tax_rate) ? (
        <div className="flex flex-wrap gap-x-3 text-xs text-[var(--ant-color-text-secondary)] sm:col-span-4">
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
 * A supplier can dispute only before approving, so an empty approval time means they disputed.
 * @param {string | null | undefined} supplierApprovedAt
 */
function supplierDisputed(supplierApprovedAt) {
  return typeof supplierApprovedAt !== "string" || supplierApprovedAt.trim() === "";
}

/**
 * @param {string | null | undefined} status
 * @param {(key: string) => string} t
 * @param {boolean} asSupplier
 * @param {string | null | undefined} supplierApprovedAt
 */
function statusHint(t, status, asSupplier, supplierApprovedAt) {
  if (status === "waiting_company") return asSupplier ? t("hintWaitingBuyer") : t("hintWaitingCompany");
  if (status === "waiting_buyer") return asSupplier ? t("hintWaitingCompanyAfterYou") : t("hintWaitingBuyer");
  if (status === "fully_approved") return t("hintFullyApproved");
  if (status === "revoked") return t("hintRevoked");
  if (status === "disputed") {
    if (supplierDisputed(supplierApprovedAt)) {
      return asSupplier ? t("hintDisputed") : t("hintDisputedBySupplier");
    }
    return asSupplier ? t("hintDisputedByBuyer") : t("hintDisputed");
  }
  if (status === "tampered") return t("hintTampered");
  if (status === "pending_chain") return t("hintPendingChain");
  if (status === "not_registered") return t("hintNotRegistered");
  if (status === "verified") return asSupplier ? t("hintWaitingBuyer") : t("hintVerified");
  return null;
}

/**
 * @param {string | null | undefined} status
 * @param {(key: string) => string} t
 * @param {boolean} asSupplier
 */
function portalStatusLabel(t, status, asSupplier) {
  if (status === "verified") return t("statusVerified");
  if (status === "tampered") return t("statusTampered");
  if (status === "not_registered") return t("statusNotRegistered");
  if (status === "pending_chain") return t("statusPendingChain");
  if (status === "waiting_company") return asSupplier ? t("statusWaitingYou") : t("statusWaitingCompany");
  if (status === "waiting_buyer") return asSupplier ? t("statusWaitingCompany") : t("statusWaitingYou");
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
 *   variant?: "buyer" | "vendor";
 * }} props
 */
function InvoiceProofPortalInner({ invoiceId, initialHost, variant = "buyer" }) {
  const t = useTranslations("InvoiceProofPortal");
  const tInvoices = useTranslations("SalesInvoices");
  const locale = useLocale();
  const tApiErrors = useTranslations("ApiErrors");
  const { message, notification } = App.useApp();
  const searchParams = useSearchParams();
  const validId = isUuid(invoiceId) ? invoiceId.trim() : null;
  const isVendor = variant === "vendor";
  const portalRole = isVendor ? "vendor" : "buyer";
  const portalBasePath = isVendor ? "/proofs/purchases" : "/proofs/sales";
  const fetchPortal = isVendor ? fetchPurchaseProofPortal : fetchInvoiceProofPortal;
  const unlockPortal = isVendor ? unlockPurchaseProofPortal : unlockInvoiceProofPortal;
  const resumePortal = isVendor ? resumePurchaseProofPortal : resumeInvoiceProofPortal;
  const portalLink = useMemo(
    () => ({
      exp: searchParams.get("exp"),
      sig: searchParams.get("sig"),
    }),
    [searchParams],
  );
  const hasStamp = hasBuyerPortalLinkStamp(portalLink);
  const portalQuery = useInvoiceProofPortalQuery(validId, portalLink, fetchPortal);
  const [invoice, setInvoice] = useState(null);
  const [unlockedBy, setUnlockedBy] = useState(
    /** @type {{ address: string; buyerIsSafe: boolean } | null} */ (null),
  );
  const portalLinkKey = `${validId ?? ""}|${portalLink.exp ?? ""}|${portalLink.sig ?? ""}`;
  const [invoiceLinkKey, setInvoiceLinkKey] = useState(portalLinkKey);
  const [portalTab, setPortalTab] = useState("invoice");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [resumeState, setResumeState] = useState(() => (readPortalSession(portalRole) ? "pending" : "skipped"));
  if (invoiceLinkKey !== portalLinkKey) {
    setInvoiceLinkKey(portalLinkKey);
    setInvoice(null);
    setPortalTab("invoice");
    setResumeState(readPortalSession(portalRole) ? "pending" : "skipped");
  }

  const accountSwitchedMessage = t("accountSwitched");
  const accountSwitchedMessageRef = useRef(accountSwitchedMessage);
  useEffect(() => {
    accountSwitchedMessageRef.current = accountSwitchedMessage;
  }, [accountSwitchedMessage]);

  useEffect(() => {
    if (!validId || !hasStamp || resumeState !== "pending") return undefined;
    let cancelled = false;
    (async () => {
      const session = readPortalSession(portalRole);
      if (!session) {
        if (!cancelled) setResumeState("skipped");
        return;
      }
      const account = await readConnectedAccount();
      if (cancelled) return;
      if (account !== "" && account !== session.address) {
        clearPortalSession(portalRole);
        setResumeState("skipped");
        return;
      }
      if (account === "") {
        setResumeState("skipped");
        return;
      }
      try {
        const result = await resumePortal(validId, portalLink, { session: session.token, address: account });
        if (cancelled) return;
        if (result && typeof result === "object" && result.locked !== true) {
          const token = typeof result.portal_session === "string" ? result.portal_session : session.token;
          savePortalSession(portalRole, { token, address: account, buyerIsSafe: session.buyerIsSafe });
          setUnlockedBy({ address: account, buyerIsSafe: session.buyerIsSafe || result.buyer_wallet_type === "safe" });
          setInvoice(result);
        }
        setResumeState("ready");
      } catch (err) {
        if (cancelled) return;
        if (getApiErrorCode(err) === "PROOF_SESSION_INVALID") clearPortalSession(portalRole);
        setResumeState("skipped");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasStamp, portalLink, portalRole, resumePortal, resumeState, validId]);

  useEffect(() => {
    if (!invoice || typeof invoice !== "object" || invoice.locked === true) return undefined;

    return watchProofPortalAccount(unlockedBy?.address ?? invoice.buyer_wallet, () => {
      clearPortalSession(portalRole);
      setResumeState("skipped");
      setInvoice(null);
      message.warning({
        content: accountSwitchedMessageRef.current,
        key: "invoice-proof-portal-account-switched",
      });
    });
  }, [invoice, unlockedBy, message, portalRole]);

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
  const hint = statusHint(t, status, isVendor, proof?.supplier_approved_at);
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
    else if (code === "not_safe_owner") description = isVendor ? t("notSafeOwnerSupplier") : t("notSafeOwner");
    else if (code === "pending_confirmations") description = t("pendingConfirmations");
    else description = getLocalizedApiErrorMessage(tApiErrors, err) || fallback;
    notification.error({ title, description });
  }

  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (validId == null) throw new BuyerApprovalError("failed");
      const fresh = await fetchPortal(validId, portalLink);
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
      const result = await unlockPortal(validId, portalLink, signed);
      return { result, signed };
    },
    onError: (err) => notifyWalletError(err, t("unlockError"), t("unlockError")),
    onSuccess: ({ result, signed }) => {
      if (result && typeof result === "object" && result.locked !== true) {
        const token = typeof result.portal_session === "string" ? result.portal_session : "";
        if (token !== "") {
          savePortalSession(portalRole, {
            token,
            address: signed.address,
            buyerIsSafe: signed.buyerIsSafe,
          });
        }
        setUnlockedBy({ address: signed.address, buyerIsSafe: signed.buyerIsSafe });
        setInvoice(result);
        setResumeState("ready");
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (validId == null) throw new BuyerApprovalError("failed");
      const chainId = Number(proof?.chain_id);
      const contractAddress = typeof proof?.contract_address === "string" ? proof.contract_address : "";
      const eip712 = proof?.eip712 && typeof proof.eip712 === "object" ? proof.eip712 : null;
      if (!Number.isFinite(chainId) || chainId <= 0 || contractAddress === "" || eip712 == null) {
        throw new BuyerApprovalError("failed");
      }
      if (isVendor) {
        const supplierWallet = typeof proof?.supplier_wallet === "string" ? proof.supplier_wallet : "";
        if (supplierWallet === "") throw new BuyerApprovalError("failed");
        const sent = await sendSupplierApproval({
          chainId,
          contractAddress,
          supplierWallet,
          eip712,
          blockchainNetwork: typeof proof?.blockchain_network === "string" ? proof.blockchain_network : null,
          safeTxServiceUrl: typeof proof?.safe_tx_service_url === "string" ? proof.safe_tx_service_url : null,
          safeApiKey: typeof proof?.safe_api_key === "string" ? proof.safe_api_key : null,
        });
        if (sent.status === "proposed") return { proposed: true, role: "supplier", approvedAt: null };
        const approvedAt = sent.txHash ? await buyerApprovedAtFromTx(sent.txHash) : null;
        return { proposed: false, role: "supplier", approvedAt: approvedAt ?? new Date().toISOString() };
      }
      const buyerWallet = typeof proof?.buyer_wallet === "string" ? proof.buyer_wallet : "";
      if (buyerWallet === "") throw new BuyerApprovalError("failed");
      if (unlockedBy?.buyerIsSafe) {
        const sent = await sendBuyerSafeApproval({ chainId, contractAddress, buyerWallet, eip712 });
        if (sent.status === "proposed") return { proposed: true, role: "buyer", approvedAt: null };
        return { proposed: false, role: "buyer", approvedAt: await buyerApprovedAtFromTx(sent.txHash) };
      }
      const txHash = await sendBuyerApproval({ chainId, contractAddress, buyerWallet, eip712 });
      return { proposed: false, role: "buyer", approvedAt: await buyerApprovedAtFromTx(txHash) };
    },
    onError: (err) => notifyWalletError(err, t("approveError"), t("approveError")),
    onSuccess: ({ proposed, role, approvedAt }) => {
      if (proposed) {
        message.info(t("approveSafeProposed"));
        return;
      }
      message.success(t("approveSuccess"));
      setDisputeOpen(false);
      setDisputeReason("");
      setInvoice((current) => {
        if (!current || typeof current !== "object") return current;
        const stampedAt = typeof approvedAt === "string" && approvedAt !== "" ? approvedAt : null;
        if (role === "supplier") {
          return {
            ...current,
            status: "waiting_buyer",
            can_approve_as_company: false,
            can_dispute_as_supplier: false,
            eip712: null,
            dispute_eip712: null,
            supplier_approved_at: stampedAt ?? current.supplier_approved_at,
          };
        }
        return {
          ...current,
          status: "fully_approved",
          can_approve_as_buyer: false,
          can_approve_as_company: false,
          can_dispute_as_buyer: false,
          eip712: null,
          dispute_eip712: null,
          buyer_approved_at: stampedAt ?? current.buyer_approved_at,
        };
      });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (validId == null) throw new BuyerApprovalError("failed");
      const reason = disputeReason.trim();
      if (reason === "") throw new BuyerApprovalError("failed");
      const chainId = Number(proof?.chain_id);
      const contractAddress = typeof proof?.contract_address === "string" ? proof.contract_address : "";
      const eip712 = proof?.dispute_eip712 && typeof proof.dispute_eip712 === "object" ? proof.dispute_eip712 : null;
      if (!Number.isFinite(chainId) || chainId <= 0 || contractAddress === "" || eip712 == null) {
        throw new BuyerApprovalError("failed");
      }
      if (isVendor) {
        const supplierWallet = typeof proof?.supplier_wallet === "string" ? proof.supplier_wallet : "";
        if (supplierWallet === "") throw new BuyerApprovalError("failed");
        const sent = await sendSupplierDispute({
          chainId,
          contractAddress,
          supplierWallet,
          eip712,
          reason,
          blockchainNetwork: typeof proof?.blockchain_network === "string" ? proof.blockchain_network : null,
          safeTxServiceUrl: typeof proof?.safe_tx_service_url === "string" ? proof.safe_tx_service_url : null,
          safeApiKey: typeof proof?.safe_api_key === "string" ? proof.safe_api_key : null,
        });
        if (sent.status === "proposed") return { proposed: true, result: null };
        const result = await recordPurchaseProofDispute(validId, portalLink, {
          reason,
          tx_hash: sent.txHash ?? "",
        });
        return { proposed: false, result };
      }
      const buyerWallet = typeof proof?.buyer_wallet === "string" ? proof.buyer_wallet : "";
      if (buyerWallet === "") throw new BuyerApprovalError("failed");
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

  async function openWithSession(address) {
    const session = readPortalSession(portalRole);
    if (!session || session.address !== address || validId == null) return false;
    const result = await resumePortal(validId, portalLink, { session: session.token, address });
    if (!result || typeof result !== "object" || result.locked === true) return false;
    const token = typeof result.portal_session === "string" ? result.portal_session : session.token;
    savePortalSession(portalRole, { token, address, buyerIsSafe: session.buyerIsSafe });
    setUnlockedBy({ address, buyerIsSafe: session.buyerIsSafe || result.buyer_wallet_type === "safe" });
    setInvoice(result);
    setResumeState("ready");
    return true;
  }

  async function connectOrUnlock() {
    const address = await connectProofPortalAccount();
    try {
      if (await openWithSession(address)) return;
    } catch (err) {
      if (getApiErrorCode(err) === "PROOF_SESSION_INVALID") clearPortalSession(portalRole);
      if (getApiErrorCode(err) !== "PROOF_WALLET_MISMATCH" && getApiErrorCode(err) !== "PROOF_SESSION_INVALID") {
        notifyWalletError(err, t("unlockError"), t("unlockError"));
        return;
      }
    }
    unlockMutation.mutate();
  }

  async function refreshPortal() {
    const session = readPortalSession(portalRole);
    const account = await readConnectedAccount();
    if (account === "") {
      clearPortalSession(portalRole);
      setResumeState("skipped");
      setInvoice(null);
      return;
    }
    if (session && account !== session.address) {
      clearPortalSession(portalRole);
      setResumeState("skipped");
      setInvoice(null);
      return;
    }
    try {
      if (await openWithSession(account)) return;
    } catch {
      clearPortalSession(portalRole);
    }
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
  } else if (portalQuery.isLoading || (!proof && !challenge) || (!proof && resumeState === "pending")) {
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
            {t(isVendor ? "unlockSubtitleSupplier" : "unlockSubtitle")}
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
                onClick={() => {
                  connectOrUnlock().catch((err) => notifyWalletError(err, t("unlockError"), t("unlockError")));
                }}
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
    const otherInvoices = Array.isArray(proof.other_invoices) ? proof.other_invoices : [];
    body = (
      <Tabs
        activeKey={portalTab}
        onChange={setPortalTab}
        items={[
          {
            key: "invoice",
            label: t("tabInvoice"),
            children: (
      <>
        <div className="mb-5 flex items-start justify-between gap-4">
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
          <div className="mt-1 flex shrink-0 flex-col items-end gap-2">
            {status ? (
              <Tag className="shrink-0" color={invoiceProofStatusTagColor(status)}>
                {portalStatusLabel(t, status, isVendor)}
              </Tag>
            ) : null}
            {unlockedBy ? (
              <InvoicePdfDownloadButton
                invoiceId={validId}
                invoiceNumber={typeof proof.invoice_number === "string" ? proof.invoice_number : null}
                label={t("actionDownloadPdf")}
                failedLabel={t("pdfFailed")}
                fetchPdf={(id) => {
                  const session = readPortalSession(portalRole);
                  if (!session) return Promise.reject(new Error("session"));
                  const link = { ...portalLink, session: session.token, address: unlockedBy.address };
                  return isVendor ? fetchVendorPortalInvoicePdf(id, link) : fetchBuyerPortalInvoicePdf(id, link);
                }}
              />
            ) : null}
          </div>
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
              <div className="text-[var(--ant-color-text-secondary)]">
                {isVendor ? t("chainYouApprovedAt") : t("chainSupplierApprovedAt")}
              </div>
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
              <div className="text-[var(--ant-color-text-secondary)]">
                {isVendor ? t("chainSupplierApprovedAt") : t("chainBuyerApprovedAt")}
              </div>
              <div className="mt-0.5 font-medium">{formatTenantDateTime(proof.buyer_approved_at) || "—"}</div>
              {formatTenantDateTime(proof.buyer_approved_at) && shortAddress(proof.buyer_wallet) ? (
                <p className="mb-0 mt-0.5 font-mono text-xs text-[var(--ant-color-text-secondary)]" dir="ltr">
                  <Tooltip title={String(proof.buyer_wallet)}>
                    <span className="cursor-help break-all">{shortAddress(proof.buyer_wallet)}</span>
                  </Tooltip>
                </p>
              ) : null}
            </div>
            {visibleAttestations(proof.attestations, isVendor ? "buyer" : "supplier").map((attestation) => (
              <div key={`${attestation.party_side}-${attestation.role}-${attestation.verifier}`}>
                <div className="text-[var(--ant-color-text-secondary)]">
                  {tInvoices(
                    attestation.role === "tax_authority"
                      ? "chainAttestedTaxAuthority"
                      : attestation.role === "financier"
                        ? "chainAttestedFinancier"
                        : "chainAttestedAuditor",
                  )}
                  {" · "}
                  {t(attestationSideLabelKey(attestation.party_side, isVendor ? "supplier" : "buyer"))}
                </div>
                <div className="mt-0.5 font-medium">{formatTenantDateTime(attestation.attested_at) || "—"}</div>
                {typeof attestation.verifier_name === "string" && attestation.verifier_name.trim() !== "" ? (
                  <div className="mt-0.5 text-xs text-[var(--ant-color-text-secondary)]">{attestation.verifier_name}</div>
                ) : null}
              </div>
            ))}
            {!isVendor && formatTenantDateTime(proof.financed_at) ? (
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
              basePath={portalBasePath}
            />
            <RelatedInvoiceField
              label={t("replacedBy")}
              invoice={proof.replaced_by_invoice}
              fallbackNumber={proof.replaced_by_invoice_number}
              fallbackId={proof.replaced_by}
              locale={locale}
              basePath={portalBasePath}
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
            <Typography.Text className="mb-2 block font-medium sm:hidden">{t("lines")}</Typography.Text>
            {lines.length === 0 ? (
              <div className="text-sm text-[var(--ant-color-text-secondary)]">—</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--ant-color-border-secondary)]">
                <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem_9rem] gap-3 border-b border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-fill-quaternary)] px-3 py-2 text-xs font-medium text-[var(--ant-color-text-secondary)] sm:grid">
                  <span>{t("lines")}</span>
                  <span className="text-end">{tInvoices("lineQuantity")}</span>
                  <span className="text-end">{tInvoices("lineUnitPrice")}</span>
                  <span className="text-end">{tInvoices("lineTotal")}</span>
                </div>
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
        <div className="mt-2 flex flex-col-reverse gap-3 border-t border-[var(--ant-color-border-secondary)] pt-4 sm:flex-row sm:justify-end">
          <Button onClick={() => void refreshPortal()} loading={portalQuery.isFetching || unlockMutation.isPending}>
            {t("refresh")}
          </Button>
          {proof.can_dispute_as_buyer || proof.can_dispute_as_supplier ? (
            <Button
              danger
              loading={disputeMutation.isPending}
              onClick={() => setDisputeOpen(true)}
            >
              {t("dispute")}
            </Button>
          ) : null}
          {proof.can_approve_as_buyer || proof.can_approve_as_company ? (
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
            ),
          },
          {
            key: "others",
            label: (
              <span className="inline-flex items-center gap-2">
                {t("tabOther")}
                <span className="rounded-full bg-[var(--ant-color-fill-secondary)] px-1.5 text-xs tabular-nums leading-5">
                  {otherInvoices.length}
                </span>
              </span>
            ),
            children: otherInvoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--ant-color-border-secondary)] px-4 py-10 text-center text-sm text-[var(--ant-color-text-secondary)]">
                {t("historyEmpty")}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {otherInvoices.map((item) => {
                  const id = typeof item?.id === "string" ? item.id : "";
                  const href = proofPortalHref(locale, item, portalBasePath);
                  const total = formatTenantMoney(item?.grand_total);
                  const currency = typeof item?.currency_code === "string" ? item.currency_code : "";
                  const itemStatus = typeof item?.status === "string" ? item.status : "";
                  return (
                    <a
                      key={id || href || item?.invoice_number}
                      href={href || undefined}
                      className="flex items-center justify-between gap-4 rounded-xl border border-[var(--ant-color-border-secondary)] px-4 py-3.5 text-inherit no-underline transition-colors hover:bg-[var(--ant-color-fill-quaternary)]"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold">{item?.invoice_number || "—"}</span>
                        <span className="text-sm text-[var(--ant-color-text-secondary)]">
                          {formatTenantDate(item?.invoice_date) || "—"}
                          {total ? ` · ${total}${currency ? ` ${currency}` : ""}` : ""}
                        </span>
                      </span>
                      {itemStatus ? (
                        <Tag className="shrink-0" color={invoiceProofStatusTagColor(itemStatus)}>
                          {portalStatusLabel(t, itemStatus, isVendor)}
                        </Tag>
                      ) : (
                        <span className="shrink-0 text-sm text-[var(--ant-color-text-secondary)]">{t("historyOpen")}</span>
                      )}
                    </a>
                  );
                })}
              </div>
            ),
          },
        ]}
      />
    );
  }

  return (
    <AuthSplitShell isCentral={mode.isCentral} tenantLabel={tenantLabel} scrollable documentLayout wide>
      {body}
      <Modal
        title={t("disputeTitle")}
        open={disputeOpen}
        onCancel={() => setDisputeOpen(false)}
        okText={t("disputeConfirm")}
        confirmLoading={disputeMutation.isPending}
        okButtonProps={{ danger: true, disabled: disputeReason.trim() === "" }}
        styles={{ body: { paddingBottom: 28 } }}
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
export default function InvoiceProofPortalPage({ invoiceId, initialHost, variant = "buyer" }) {
  return (
    <App className="flex min-h-dvh flex-col">
      <InvoiceProofPortalInner invoiceId={invoiceId} initialHost={initialHost} variant={variant} />
    </App>
  );
}
