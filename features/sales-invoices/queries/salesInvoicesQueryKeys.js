export const SALES_INVOICES_QUERY_KEY = /** @type {const} */ (["tenant", "sales-invoices"]);

export const SALES_INVOICE_DETAIL_QUERY_PREFIX = /** @type {const} */ ([
  "tenant",
  "sales-invoice",
]);

/**
 * @param {string | null | undefined} itemId
 */
export function salesInvoiceItemAvailabilityQueryKey(itemId) {
  return [...SALES_INVOICES_QUERY_KEY, "item-availability", itemId ?? null];
}
