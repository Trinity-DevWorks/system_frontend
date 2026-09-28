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
 * @param {string | null | undefined} status
 */
export function isSalesInvoicePosted(status) {
  return status === "posted";
}
