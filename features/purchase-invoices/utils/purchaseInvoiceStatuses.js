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
