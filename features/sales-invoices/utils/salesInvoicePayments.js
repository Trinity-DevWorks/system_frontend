/*
 * Payments taken when a sales invoice is posted (split payment), as form rows.
 * A row may be in another currency than the invoice (e.g. a USD invoice paid partly in LBP),
 * be the customer's existing credit (kind "credit"), be a cheque, or hand change back in another currency.
 */

/** @param {any} r */
export function isCreditRow(r) {
  return Boolean(r) && r.kind === "credit";
}

/**
 * Row has an amount above zero and a method (credit rows need none). Empty rows are skipped.
 * @param {any} r
 */
function isFilledRow(r) {
  if (!r || !(Number(r.amount) > 0)) return false;
  return isCreditRow(r) || (r.payment_method_id != null && r.payment_method_id !== "");
}

/** @param {unknown} v */
function numberOrNull(v) {
  return v == null || v === "" ? null : Number(v);
}

/** @param {unknown} v */
function textOrNull(v) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
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
    if (isCreditRow(r)) return { kind: "credit", amount: Number(r.amount) };
    const currencyId = numberOrNull(r.currency_id);
    const sameCurrency = currencyId == null || (invoiceCurrencyId != null && currencyId === Number(invoiceCurrencyId));
    const changeCurrencyId = numberOrNull(r.change_currency_id);
    const foreignChange = changeCurrencyId != null && changeCurrencyId !== (currencyId ?? Number(invoiceCurrencyId));
    return {
      kind: "payment",
      payment_method_id: Number(r.payment_method_id),
      cash_bank_account_id: numberOrNull(r.cash_bank_account_id),
      currency_id: currencyId,
      exchange_rate: sameCurrency ? null : numberOrNull(r.exchange_rate),
      amount: Number(r.amount),
      reference: textOrNull(r.reference),
      tendered: numberOrNull(r.tendered),
      change_currency_id: foreignChange ? changeCurrencyId : null,
      change_amount: foreignChange ? numberOrNull(r.change_amount) : null,
      change_rate: foreignChange ? numberOrNull(r.change_rate) : null,
      cheque_number: textOrNull(r.cheque_number),
      cheque_bank: textOrNull(r.cheque_bank),
      cheque_due_date: r.cheque_due_date && typeof r.cheque_due_date.format === "function"
        ? r.cheque_due_date.format("YYYY-MM-DD")
        : textOrNull(r.cheque_due_date),
    };
  });
}

/**
 * Paid now and what stays on the customer's account, in the invoice currency.
 * `toInvoice(row)` converts one row's amount to the invoice currency.
 * A gap within `allowedDifference` counts as fully paid (same rule as the backend).
 * `extra` is what is paid beyond the total (kept as customer credit when allowed).
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
  const over = -gap > tolerance;
  return {
    paid,
    onAccount: Math.abs(gap) <= tolerance ? 0 : Math.max(0, gap),
    over,
    extra: over ? Math.round(-gap * 10000) / 10000 : 0,
  };
}

/**
 * Change to hand back per row (cash given − amount), in the row's currency or the chosen change currency.
 * @param {unknown} rows
 * @returns {{ index: number; currencyId: unknown; change: number }[]}
 */
export function salesInvoicePaymentChanges(rows) {
  if (!Array.isArray(rows)) return [];
  /** @type {{ index: number; currencyId: unknown; change: number }[]} */
  const out = [];
  rows.forEach((r, index) => {
    if (!isFilledRow(r) || isCreditRow(r) || r.tendered == null || r.tendered === "") return;
    const change = Number(r.tendered) - Number(r.amount);
    if (!(change > 0)) return;
    if (r.change_currency_id != null && r.change_currency_id !== "" && Number(r.change_amount) > 0) {
      out.push({ index, currencyId: r.change_currency_id, change: Number(r.change_amount) });
      return;
    }
    out.push({ index, currencyId: r.currency_id, change });
  });
  return out;
}
