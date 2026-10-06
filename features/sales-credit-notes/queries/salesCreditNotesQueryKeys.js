export const SALES_CREDIT_NOTES_QUERY_KEY = /** @type {const} */ (["tenant", "sales-credit-notes"]);

export const SALES_CREDIT_NOTE_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "sales-credit-note",
]);

/**
 * @param {string | null | undefined} [customerId]
 */
export function salesCreditNoteOpenInvoicesQueryKey(customerId) {
  return [...SALES_CREDIT_NOTES_QUERY_KEY, "open-invoices", customerId ?? null];
}

/**
 * @param {string | null | undefined} invoiceId
 */
export function salesCreditNoteSourceLinesQueryKey(invoiceId) {
  return [...SALES_CREDIT_NOTES_QUERY_KEY, "source-lines", invoiceId ?? null];
}
