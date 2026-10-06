/** @typedef {"draft" | "posted" | "reversed"} SalesCreditNoteStatus */

export const SALES_CREDIT_NOTE_STATUS_VALUES = /** @type {const} */ (["draft", "posted", "reversed"]);

/**
 * @param {(key: string) => string} t
 * @param {string | null | undefined} status
 */
export function getSalesCreditNoteStatusLabel(t, status) {
  if (status === "draft") return t("statusDraft");
  if (status === "posted") return t("statusPosted");
  if (status === "reversed") return t("statusReversed");
  return status ? String(status) : "\u2014";
}

/**
 * @param {string | null | undefined} status
 */
export function salesCreditNoteStatusTagColor(status) {
  if (status === "posted") return "success";
  if (status === "reversed") return "warning";
  return "processing";
}

/**
 * @param {string | null | undefined} status
 */
export function isSalesCreditNoteDraft(status) {
  return status === "draft" || status == null;
}
