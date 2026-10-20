export const CREDIT_DOCUMENT_STATUS_VALUES = ["draft", "posted", "reversed"];
export const CREDIT_DOCUMENT_TYPE_VALUES = ["return", "allowance"];

/** @param {(key: string) => string} t @param {unknown} status */
export function getCreditDocumentStatusLabel(t, status) {
  if (status === "posted") return t("statusPosted");
  if (status === "reversed") return t("statusReversed");
  return t("statusDraft");
}

/** @param {unknown} status */
export function creditDocumentStatusTagColor(status) {
  if (status === "posted") return "green";
  if (status === "reversed") return "red";
  return "default";
}

/** @param {unknown} status */
export function isCreditDocumentDraft(status) {
  return status === "draft" || status == null || status === "";
}

/** @param {(key: string) => string} t @param {unknown} type */
export function getCreditDocumentTypeLabel(t, type) {
  return type === "allowance" ? t("typeAllowance") : t("typeReturn");
}
