/** @typedef {"verified" | "tampered" | "not_registered" | "pending_chain" | "waiting_company" | "waiting_buyer" | "fully_approved"} InvoiceProofVerificationStatus */

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
  return status ? String(status) : "\u2014";
}

/**
 * True while the invoice is waiting for the chain registration job to finish.
 * @param {string | null | undefined} status
 */
export function isInvoiceChainPending(status) {
  return status === "pending_chain";
}

/**
 * Poll interval while any invoice on the current page is still pending on chain.
 * @param {{ state: { data?: { rows?: unknown[] } | undefined } }} query
 * @returns {number | false}
 */
export function salesInvoiceListChainPollInterval(query) {
  const rows = query.state.data?.rows;
  if (!Array.isArray(rows)) return false;
  const pending = rows.some(
    (row) =>
      row &&
      typeof row === "object" &&
      isInvoiceChainPending(
        /** @type {{ chain_status?: { status?: string } }} */ (row).chain_status?.status,
      ),
  );
  return pending ? INVOICE_CHAIN_PENDING_POLL_MS : false;
}

/**
 * @param {string | null | undefined} status
 */
export function invoiceProofStatusTagColor(status) {
  if (status === "verified" || status === "fully_approved") return "success";
  if (status === "tampered") return "error";
  if (status === "not_registered") return "warning";
  if (status === "pending_chain" || status === "waiting_company" || status === "waiting_buyer") {
    return "processing";
  }
  return "default";
}
