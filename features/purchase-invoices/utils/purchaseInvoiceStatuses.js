export const PURCHASE_INVOICE_STATUS_VALUES = ["draft", "posted", "reversed"];

/**
 * @param {(key: string) => string} t
 * @param {unknown} status
 */
export function getPurchaseInvoiceStatusLabel(t, status) {
  if (status === "posted") return t("statusPosted");
  if (status === "reversed") return t("statusReversed");
  if (status === "draft") return t("statusDraft");
  return status == null ? "" : String(status);
}

/**
 * @param {unknown} status
 */
export function isPurchaseInvoiceDraft(status) {
  return status === "draft" || status == null;
}

/**
 * @param {string | null | undefined} status
 */
export function purchaseInvoiceStatusTagColor(status) {
  if (status === "posted") return "success";
  if (status === "reversed") return "warning";
  return "processing";
}

/**
 * @param {string | null | undefined} status
 * @param {unknown} paidTotal
 * @param {unknown} netToPay
 * @returns {"unpaid" | "partial" | "paid" | null}
 */
export function purchaseInvoiceSettlement(status, paidTotal, netToPay) {
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
export function getPurchaseInvoiceSettlementLabel(t, settlement) {
  if (settlement === "unpaid") return t("settlementUnpaid");
  if (settlement === "partial") return t("settlementPartial");
  if (settlement === "paid") return t("settlementPaid");
  return "";
}
