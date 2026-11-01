/*
 * Plain helper functions and small constants for the expense voucher drawer (no React).
 */

import dayjs from "dayjs";

export const EXPENSE_VOUCHER_CREATE_SAVE_INTENT_KEY = "expenseVoucherDrawer:createSaveIntent";
export const EXPENSE_VOUCHER_CREATE_SAVE_INTENT_EVENT = "expenseVoucherDrawer:createSaveIntent:change";

/** @param {unknown} value */
function dateString(value) {
  if (!value) return null;
  const d = dayjs(/** @type {any} */ (value));
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
}

/** @param {unknown} value */
function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** @param {Record<string, unknown>} v */
function snapshot(v) {
  const lines = Array.isArray(v?.lines) ? v.lines : [];
  return JSON.stringify([
    dateString(v?.voucher_date),
    numberOrNull(v?.cash_bank_account_id),
    numberOrNull(v?.exchange_rate),
    String(v?.payee ?? "").trim(),
    String(v?.reference ?? "").trim(),
    String(v?.notes ?? "").trim(),
    lines.map((l) => [numberOrNull(l?.account_id), String(l?.description ?? "").trim(), numberOrNull(l?.amount), numberOrNull(l?.vat_group_id)]),
  ]);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  return snapshot(form.getFieldsValue(true)) !== snapshot(defaults);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  return snapshot(form.getFieldsValue(true)) !== snapshot(recordToFormValues(row));
}

/**
 * @param {unknown} cashId
 * @param {unknown} lines
 */
export function requiredFieldsValid(cashId, lines) {
  if (cashId == null || cashId === "") return false;
  const rows = Array.isArray(lines) ? lines : [];
  return rows.some((l) => l && l.account_id != null && Number(l.amount) > 0);
}

/** @param {Record<string, unknown>} row */
export function toExpenseVoucherCacheRow(row) {
  return { ...row };
}

/** @param {Record<string, unknown>} r */
export function recordToFormValues(r) {
  const lines = Array.isArray(r.lines) ? r.lines : [];
  return {
    voucher_date: r.voucher_date ? dayjs(String(r.voucher_date)) : null,
    cash_bank_account_id: r.cash_bank_account_id ?? undefined,
    exchange_rate: numberOrNull(r.exchange_rate),
    payee: r.payee ?? "",
    reference: r.reference ?? "",
    notes: r.notes ?? "",
    lines: lines.map((l) => ({
      account_id: l.account_id ?? undefined,
      description: l.description ?? "",
      amount: numberOrNull(l.amount),
      vat_group_id: l.vat_group_id ?? undefined,
    })),
  };
}

/** Newest first. @param {unknown[]} list */
export function sortExpenseVouchersByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ voucher_date?: string }} */ (b).voucher_date ?? "").localeCompare(
      String(/** @type {{ voucher_date?: string }} */ (a).voucher_date ?? ""),
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function expenseVoucherFormValuesToPayload(values) {
  const trimOrNull = (value) => {
    const s = String(value ?? "").trim();
    return s === "" ? null : s;
  };
  const lines = Array.isArray(values.lines) ? values.lines : [];
  return {
    voucher_date: dateString(values.voucher_date),
    cash_bank_account_id: numberOrNull(values.cash_bank_account_id),
    exchange_rate: numberOrNull(values.exchange_rate),
    payee: trimOrNull(values.payee),
    reference: trimOrNull(values.reference),
    notes: trimOrNull(values.notes),
    lines: lines
      .filter((l) => l && l.account_id != null && numberOrNull(l.amount) != null)
      .map((l) => ({
        account_id: Number(l.account_id),
        description: trimOrNull(l.description),
        amount: numberOrNull(l.amount),
        vat_group_id: l.vat_group_id == null || l.vat_group_id === "" ? null : Number(l.vat_group_id),
      })),
  };
}
