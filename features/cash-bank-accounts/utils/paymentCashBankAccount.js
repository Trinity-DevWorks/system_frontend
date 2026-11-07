/**
 * Cash/bank account for a payment, same rule as the backend: among the payment method's linked active
 * accounts in the document currency, the branch's own one, else the shared one (no branch).
 * Undefined when none fits (the backend then refuses to post).
 *
 * @param {Record<string, any> | undefined} method payment method (with `cash_bank_accounts`)
 * @param {Array<Record<string, any>>} accounts cash/bank accounts (to skip inactive ones)
 * @param {unknown} branchId
 * @param {unknown} currencyId
 * @returns {number | undefined}
 */
export function defaultPaymentAccountId(method, accounts, branchId, currencyId) {
  if (!method || currencyId == null) return undefined;
  const branch = branchId == null || branchId === "" ? null : Number(branchId);
  const active = new Set(accounts.filter((a) => a && a.is_active !== false).map((a) => Number(a.id)));
  const linked = (Array.isArray(method.cash_bank_accounts) ? method.cash_bank_accounts : []).filter(
    (r) => Number(r.currency_id) === Number(currencyId) && active.has(Number(r.cash_bank_account_id)),
  );
  const own = branch != null ? linked.find((r) => r.branch_id != null && Number(r.branch_id) === branch) : undefined;
  const row = own ?? linked.find((r) => r.branch_id == null);
  return row ? Number(row.cash_bank_account_id) : undefined;
}

/**
 * Accounts a payment in this currency and branch may use: active, same currency, shared or of the branch.
 *
 * @param {Array<Record<string, any>>} accounts
 * @param {unknown} branchId
 * @param {unknown} currencyId
 */
export function paymentAccountOptions(accounts, branchId, currencyId) {
  const branch = branchId == null || branchId === "" ? null : Number(branchId);
  return accounts
    .filter(
      (a) =>
        a &&
        a.is_active !== false &&
        (currencyId == null || Number(a.currency_id) === Number(currencyId)) &&
        (a.branch_id == null || branch == null || Number(a.branch_id) === branch),
    )
    .map((a) => ({ value: Number(a.id), label: `${a.code} — ${a.name}` }));
}
