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

/**
 * Field labels from InvoiceProofDisclosure.fields, used to name a tampered leaf.
 * @param {unknown} messages
 * @returns {Record<string, string>}
 */
export function disclosureFieldLabels(messages) {
  const block = messages && typeof messages === "object" ? messages.InvoiceProofDisclosure : null;
  const fields = block && typeof block === "object" ? /** @type {{ fields?: unknown }} */ (block).fields : null;
  return fields && typeof fields === "object" ? /** @type {Record<string, string>} */ (fields) : {};
}

/**
 * The line shown on a tampered invoice.
 * `snapshot` names the leaves that no longer match the seal.
 * `chain` means the stored copy still matches and the blockchain hash is different.
 *
 * @param {(key: string, values?: Record<string, string | number>) => string} t
 * @param {Record<string, string>} labels
 * @param {unknown} reason
 * @param {unknown} paths
 */
export function describeTamper(t, labels, reason, paths) {
  if (reason === "chain") return t("tamperChain");
  if (reason !== "snapshot") return t("verifySuccessTampered");
  const names = [];
  const list = Array.isArray(paths) ? paths : [];
  for (const path of list) {
    const label = labelTamperPath(String(path), labels, t);
    if (label !== "") names.push(label);
  }
  if (names.length === 0) return t("tamperSnapshot");
  if (names.length === 1) return t("tamperField", { field: names[0] });
  return t("tamperFields", { fields: quoteTamperNames(names, t) });
}

/**
 * @param {(key: string, values?: Record<string, string | number>) => string} t
 * @param {Record<string, string>} labels
 * @param {string} path
 */
export function tamperFieldSentence(t, labels, path) {
  return t("tamperField", { field: labelTamperPath(path, labels, t) });
}

/**
 * @param {string[]} names
 * @param {(key: string, values?: Record<string, string | number>) => string} t
 */
function quoteTamperNames(names, t) {
  const quoted = names.map((name) => `"${name}"`);
  if (quoted.length === 2) return `${quoted[0]} ${t("tamperAnd")} ${quoted[1]}`;
  return `${quoted.slice(0, -1).join(", ")}, ${t("tamperAnd")} ${quoted[quoted.length - 1]}`;
}

/**
 * @param {string} path
 * @param {Record<string, string>} labels
 * @param {(key: string, values?: Record<string, string | number>) => string} t
 */
function labelTamperPath(path, labels, t) {
  const segments = path.split(".").filter((part) => part !== "");
  const parts = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === "lines" && /^\d+$/.test(segments[index + 1] ?? "")) continue;
    if (/^\d+$/.test(segment)) {
      parts.push(t("tamperLine", { n: Number(segment) + 1 }));
      continue;
    }
    parts.push(typeof labels[segment] === "string" ? labels[segment] : segment);
  }
  return parts.join(" ");
}
