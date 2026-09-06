/** @typedef {"draft" | "posted"} SalesInvoiceStatus */

export const SALES_INVOICE_STATUS_VALUES = /** @type {const} */ (["draft", "posted"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getSalesInvoiceStatusLabel(t, status) {
  if (status === "draft") return t("statusDraft");
  if (status === "posted") return t("statusPosted");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function salesInvoiceStatusTagColor(status) {
  if (status === "posted") return "success";
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
