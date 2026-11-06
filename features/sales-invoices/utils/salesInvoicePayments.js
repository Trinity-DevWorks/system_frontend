/*
 * Payments taken when a sales invoice is posted (split payment), as form rows.
 * A row may be in another currency than the invoice (e.g. a USD invoice paid partly in LBP).
 */

/**
 * Row has a method and an amount above zero (empty rows are skipped).
 * @param {any} r
 */
function isFilledRow(r) {
  return Boolean(r) && r.payment_method_id != null && r.payment_method_id !== "" && Number(r.amount) > 0;
}

/**
 * Payment modal rows → API rows (empty rows dropped).
 * `invoiceCurrencyId`: a row in this currency sends no rate (the backend uses the invoice rate).
 *
 * @param {unknown} rows
 * @param {unknown} [invoiceCurrencyId]
 */
export function salesInvoicePaymentsPayload(rows, invoiceCurrencyId = null) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(isFilledRow).map((r) => {
    const currencyId = r.currency_id == null || r.currency_id === "" ? null : Number(r.currency_id);
    const sameCurrency = currencyId == null || (invoiceCurrencyId != null && currencyId === Number(invoiceCurrencyId));
    return {
      payment_method_id: Number(r.payment_method_id),
      cash_bank_account_id: r.cash_bank_account_id == null || r.cash_bank_account_id === "" ? null : Number(r.cash_bank_account_id),
      currency_id: currencyId,
      exchange_rate: sameCurrency || r.exchange_rate == null || r.exchange_rate === "" ? null : Number(r.exchange_rate),
      amount: Number(r.amount),
      reference: typeof r.reference === "string" && r.reference.trim() ? r.reference.trim() : null,
      tendered: r.tendered == null || r.tendered === "" ? null : Number(r.tendered),
    };
  });
}

/**
 * Paid now and what stays on the customer's account, in the invoice currency.
 * `toInvoice(row)` converts one row's amount to the invoice currency.
 * A gap within `allowedDifference` counts as fully paid (same rule as the backend).
 *
 * @param {unknown} rows
 * @param {unknown} grandTotal
 * @param {(row: any) => number} toInvoice
 * @param {unknown} [allowedDifference]
 */
export function salesInvoicePaymentSummary(rows, grandTotal, toInvoice, allowedDifference = 0) {
  const filled = Array.isArray(rows) ? rows.filter(isFilledRow) : [];
  const paid = Math.round(filled.reduce((sum, r) => sum + (Number(toInvoice(r)) || 0), 0) * 10000) / 10000;
  const grand = Number(grandTotal) || 0;
  const tolerance = Math.max(0, Number(allowedDifference) || 0) + 0.000001;
  const gap = grand - paid;
  return {
    paid,
    onAccount: Math.abs(gap) <= tolerance ? 0 : Math.max(0, gap),
    over: -gap > tolerance,
  };
}

/**
 * Change to hand back per row, in that row's currency (cash given − amount).
 * @param {unknown} rows
 * @returns {{ index: number; currencyId: unknown; change: number }[]}
 */
export function salesInvoicePaymentChanges(rows) {
  if (!Array.isArray(rows)) return [];
  /** @type {{ index: number; currencyId: unknown; change: number }[]} */
  const out = [];
  rows.forEach((r, index) => {
    if (!isFilledRow(r) || r.tendered == null || r.tendered === "") return;
    const change = Number(r.tendered) - Number(r.amount);
    if (change > 0) out.push({ index, currencyId: r.currency_id, change });
  });
  return out;
}
