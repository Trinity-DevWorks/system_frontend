/*
 * Plain helper functions and small constants for the cash/bank transfer drawer (no React).
 */

import dayjs from "dayjs";

export const TREASURY_TRANSFER_CREATE_SAVE_INTENT_KEY = "treasuryTransferDrawer:createSaveIntent";
export const TREASURY_TRANSFER_CREATE_SAVE_INTENT_EVENT = "treasuryTransferDrawer:createSaveIntent:change";

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
  return JSON.stringify([
    dateString(v?.transfer_date),
    numberOrNull(v?.from_account_id),
    numberOrNull(v?.to_account_id),
    numberOrNull(v?.amount_from),
    numberOrNull(v?.amount_to),
    numberOrNull(v?.exchange_rate),
    numberOrNull(v?.exchange_rate_to),
    String(v?.reference ?? "").trim(),
    String(v?.notes ?? "").trim(),
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
 * @param {unknown} fromId
 * @param {unknown} toId
 * @param {unknown} amount
 */
export function requiredFieldsValid(fromId, toId, amount) {
  if (fromId == null || toId == null || fromId === "" || toId === "") return false;
  if (String(fromId) === String(toId)) return false;
  const n = Number(amount);
  return Number.isFinite(n) && n > 0;
}

/** @param {Record<string, unknown>} row */
export function toTreasuryTransferCacheRow(row) {
  return { ...row };
}

/** @param {Record<string, unknown>} r */
export function recordToFormValues(r) {
  return {
    transfer_date: r.transfer_date ? dayjs(String(r.transfer_date)) : null,
    from_account_id: r.from_account_id ?? undefined,
    to_account_id: r.to_account_id ?? undefined,
    amount_from: numberOrNull(r.amount_from),
    amount_to: numberOrNull(r.amount_to),
    exchange_rate: numberOrNull(r.exchange_rate),
    exchange_rate_to: numberOrNull(r.exchange_rate_to),
    reference: r.reference ?? "",
    notes: r.notes ?? "",
  };
}

/** Newest first (date, then created). @param {unknown[]} list */
export function sortTreasuryTransfersByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ transfer_date?: string }} */ (b).transfer_date ?? "").localeCompare(
      String(/** @type {{ transfer_date?: string }} */ (a).transfer_date ?? ""),
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function treasuryTransferFormValuesToPayload(values) {
  const trimOrNull = (value) => {
    const s = String(value ?? "").trim();
    return s === "" ? null : s;
  };
  return {
    transfer_date: dateString(values.transfer_date),
    from_account_id: numberOrNull(values.from_account_id),
    to_account_id: numberOrNull(values.to_account_id),
    amount_from: numberOrNull(values.amount_from),
    amount_to: numberOrNull(values.amount_to),
    exchange_rate: numberOrNull(values.exchange_rate),
    exchange_rate_to: numberOrNull(values.exchange_rate_to),
    reference: trimOrNull(values.reference),
    notes: trimOrNull(values.notes),
  };
}
