/** @typedef {"draft" | "posted" | "reversed"} SalesInvoiceStatus */

export const SALES_INVOICE_STATUS_VALUES = /** @type {const} */ (["draft", "posted", "reversed"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getSalesInvoiceStatusLabel(t, status) {
  if (status === "draft") return t("statusDraft");
  if (status === "posted") return t("statusPosted");
  if (status === "reversed") return t("statusReversed");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function salesInvoiceStatusTagColor(status) {
  if (status === "posted") return "success";
  if (status === "reversed") return "warning";
  return "processing";
}

/**
 * @param {string | null | undefined} status
 */
export function isSalesInvoiceDraft(status) {
  return status === "draft" || status == null;
}

/**
 * Derived settlement for a posted invoice. Draft and reversed invoices have none.
 * @param {string | null | undefined} status
 * @param {unknown} paidTotal
 * @param {unknown} netToPay
 * @returns {"unpaid" | "partial" | "paid" | null}
 */
export function salesInvoiceSettlement(status, paidTotal, netToPay) {
  if (status !== "posted") return null;
  const paid = Number(paidTotal ?? 0);
  const open = Number(netToPay ?? 0);
  if (!Number.isFinite(paid) || paid <= 0) return "unpaid";
  if (!Number.isFinite(open) || open <= 0) return "paid";
  return "partial";
}

/**
 * @param {(key: string) => string} t
 * @param {"unpaid" | "partial" | "paid" | null} settlement
 */
export function getSalesInvoiceSettlementLabel(t, settlement) {
  if (settlement === "unpaid") return t("settlementUnpaid");
  if (settlement === "partial") return t("settlementPartial");
  if (settlement === "paid") return t("settlementPaid");
  return "";
}

/**
 * @param {string | null | undefined} status
 */
export function isSalesInvoicePosted(status) {
  return status === "posted";
}
