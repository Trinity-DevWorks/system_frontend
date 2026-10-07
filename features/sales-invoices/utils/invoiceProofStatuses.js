/** @typedef {"verified" | "tampered" | "not_registered" | "pending_chain" | "waiting_company" | "waiting_buyer" | "fully_approved" | "revoked" | "disputed"} InvoiceProofVerificationStatus */

/** How often to re-read chain status while registration is still pending. */
export const INVOICE_CHAIN_PENDING_POLL_MS = 3000;

export const INVOICE_PROOF_STATUS_VALUES = /** @type {const} */ ([
  "verified",
  "tampered",
  "not_registered",
  "pending_chain",
  "waiting_company",
  "waiting_buyer",
  "fully_approved",
  "revoked",
  "disputed",
]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getInvoiceProofStatusLabel(t, status) {
  if (status === "verified") return t("proofStatusVerified");
  if (status === "tampered") return t("proofStatusTampered");
  if (status === "not_registered") return t("proofStatusNotRegistered");
  if (status === "pending_chain") return t("proofStatusPendingChain");
  if (status === "waiting_company") return t("proofStatusWaitingCompany");
  if (status === "waiting_buyer") return t("proofStatusWaitingBuyer");
  if (status === "fully_approved") return t("proofStatusFullyApproved");
  if (status === "revoked") return t("proofStatusRevoked");
  if (status === "disputed") return t("proofStatusDisputed");
  return status ? String(status) : "\u2014";
}

/**
 * Purchase invoices flip the waiting labels: on-chain supplier is the vendor,
 * on-chain buyer is this company.
 *
 * @param {(key: string) => string} tPurchase
 * @param {(key: string) => string} tSales
 * @param {string | null | undefined} status
 */
export function getPurchaseInvoiceProofStatusLabel(tPurchase, tSales, status) {
  if (status === "waiting_company") return tPurchase("proofStatusWaitingSupplier");
  if (status === "waiting_buyer") return tPurchase("proofStatusWaitingBuyer");
  return getInvoiceProofStatusLabel(tSales, status);
}

/**
 * True while the invoice is waiting for the chain registration job to finish.
 * @param {string | null | undefined} status
 */
export function isInvoiceChainPending(status) {
  return status === "pending_chain";
}

/**
 * Reason to keep Share proof disabled, or null when it can open.
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function shareProofBlockReason(t, status) {
  if (status === "tampered") return t("shareProofDisabledTampered");
  if (status === "pending_chain") return t("shareProofDisabledPendingChain");
  return null;
}

/**
 * Keep reading the chain after reverse until revoke lands.
 * @param {string | null | undefined} chainStatus
 * @param {string | null | undefined} invoiceStatus
 */
export function invoiceProofShouldPoll(chainStatus, invoiceStatus) {
  if (isInvoiceChainPending(chainStatus)) return true;
  if (invoiceStatus !== "reversed") return false;
  return (
    chainStatus != null &&
    chainStatus !== "" &&
    chainStatus !== "revoked" &&
    chainStatus !== "not_registered" &&
    chainStatus !== "tampered" &&
    chainStatus !== "disputed"
  );
}

/**
 * @param {unknown} row
 */
export function invoiceRowNeedsChainPoll(row) {
  if (!row || typeof row !== "object") return false;
  const record = /** @type {{ status?: string; chain_status?: { status?: string } }} */ (row);
  return invoiceProofShouldPoll(record.chain_status?.status, record.status);
}

/**
 * Poll interval while any invoice on the current page is still pending on chain
 * (or reversed but not yet revoked).
 * @param {{ state: { data?: { rows?: unknown[] } | undefined } }} query
 * @returns {number | false}
 */
export function invoiceListChainPollInterval(query) {
  const rows = query.state.data?.rows;
  if (!Array.isArray(rows)) return false;
  return rows.some(invoiceRowNeedsChainPoll) ? INVOICE_CHAIN_PENDING_POLL_MS : false;
}

/** @deprecated use invoiceListChainPollInterval */
export const salesInvoiceListChainPollInterval = invoiceListChainPollInterval;

/**
 * @param {string | null | undefined} status
 */
export function invoiceProofStatusTagColor(status) {
  if (status === "verified" || status === "fully_approved") return "success";
  if (status === "tampered") return "error";
  if (status === "revoked" || status === "disputed") return "default";
  if (status === "not_registered") return "warning";
  if (status === "pending_chain" || status === "waiting_company" || status === "waiting_buyer") {
    return "processing";
  }
  return "default";
}
