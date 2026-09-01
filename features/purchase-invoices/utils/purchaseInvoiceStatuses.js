/** @typedef {"draft" | "posted"} PurchaseInvoiceStatus */

export const PURCHASE_INVOICE_STATUS_VALUES = /** @type {const} */ (["draft", "posted"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getPurchaseInvoiceStatusLabel(t, status) {
  if (status === "draft") return t("statusDraft");
  if (status === "posted") return t("statusPosted");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function isPurchaseInvoiceDraft(status) {
  return status === "draft" || status == null;
}
