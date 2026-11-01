/*
 * Plain helper functions and small constants for the cash/bank account drawer (no React).
 */

import dayjs from "dayjs";

/** @typedef {"keep" | "new" | "close"} CashBankAccountCreateSaveIntent */

export const CASH_BANK_ACCOUNT_CREATE_SAVE_INTENT_KEY = "cashBankAccountDrawer:createSaveIntent";
export const CASH_BANK_ACCOUNT_CREATE_SAVE_INTENT_EVENT = "cashBankAccountDrawer:createSaveIntent:change";

const CODE_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
const FIELDS = ["code", "name", "type", "currency_id", "account_id", "bank_name", "iban", "account_number", "opening_balance", "opening_date", "is_active"];

/** @param {Record<string, unknown>} v */
function snapshot(v) {
  return JSON.stringify(
    FIELDS.map((key) => {
      const value = v?.[key];
      if (key === "is_active") return value !== false;
      if (value === undefined || value === null) return "";
      if (key === "opening_balance") return String(Number(value) || 0);
      if (key === "opening_date") return dayjs(/** @type {any} */ (value)).isValid() ? dayjs(/** @type {any} */ (value)).format("YYYY-MM-DD") : "";
      return typeof value === "string" ? value.trim() : String(value);
    }),
  );
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
  return snapshot(form.getFieldsValue(true)) !== snapshot(row);
}

/**
 * @param {string} code
 * @param {string} name
 * @param {unknown} [currencyId]
 * @param {unknown} [accountId]
 */
export function requiredFieldsValid(code, name, currencyId, accountId) {
  const c = String(code ?? "").trim();
  const n = String(name ?? "").trim();
  if (!c || !n || currencyId == null || currencyId === "" || accountId == null || accountId === "") return false;
  return CODE_PATTERN.test(c);
}

/** @param {Record<string, unknown>} row */
export function toCashBankAccountCacheRow(row) {
  return { ...row, is_active: row.is_active !== false };
}

/** @param {Record<string, unknown>} r */
export function recordToFormValues(r) {
  return {
    code: r.code ?? "",
    name: r.name ?? "",
    type: r.type ?? "cash",
    currency_id: r.currency_id ?? undefined,
    account_id: r.account_id ?? undefined,
    bank_name: r.bank_name ?? "",
    iban: r.iban ?? "",
    account_number: r.account_number ?? "",
    opening_balance: r.opening_balance == null ? 0 : Number(r.opening_balance),
    opening_date: r.opening_date ? dayjs(String(r.opening_date)) : null,
    is_active: r.is_active !== false,
  };
}

/** @param {unknown[]} list */
export function sortCashBankAccountsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function cashBankAccountFormValuesToPayload(values) {
  const trimOrNull = (value) => {
    const s = String(value ?? "").trim();
    return s === "" ? null : s;
  };
  return {
    code: String(values.code ?? "").trim().toUpperCase(),
    name: String(values.name ?? "").trim(),
    type: values.type === "bank" ? "bank" : "cash",
    currency_id: values.currency_id == null ? null : Number(values.currency_id),
    account_id: values.account_id == null ? null : Number(values.account_id),
    bank_name: trimOrNull(values.bank_name),
    iban: trimOrNull(values.iban),
    account_number: trimOrNull(values.account_number),
    opening_balance: Number(values.opening_balance ?? 0) || 0,
    opening_date: values.opening_date && dayjs(/** @type {any} */ (values.opening_date)).isValid()
      ? dayjs(/** @type {any} */ (values.opening_date)).format("YYYY-MM-DD")
      : null,
    is_active: values.is_active !== false,
  };
}
