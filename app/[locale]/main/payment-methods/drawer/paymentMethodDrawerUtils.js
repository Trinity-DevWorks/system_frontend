/*
 * Payment method drawer helpers (no React).
 */

export const PAYMENT_METHOD_TYPE_VALUES = [
  "cash",
  "card",
  "bank_transfer",
  "cheque",
  "digital_wallet",
  "credit",
  "other",
];

export const PAYMENT_METHOD_CREATE_SAVE_INTENT_KEY = "paymentMethodDrawer:createSaveIntent";
export const PAYMENT_METHOD_CREATE_SAVE_INTENT_EVENT = "paymentMethodDrawer:createSaveIntent:change";

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  if (String(v.code ?? "").trim() !== String(defaults.code ?? "").trim()) return true;
  if (String(v.name ?? "").trim() !== String(defaults.name ?? "").trim()) return true;
  if (String(v.type ?? "") !== String(defaults.type ?? "cash")) return true;
  const vCur = v.currency_id == null || v.currency_id === "" ? null : Number(v.currency_id);
  const dCur = defaults.currency_id == null || defaults.currency_id === "" ? null : Number(defaults.currency_id);
  if (vCur !== dCur) return true;
  if (Boolean(v.requires_reference) !== Boolean(defaults.requires_reference)) return true;
  if (Boolean(v.supports_change) !== Boolean(defaults.supports_change)) return true;
  if (Boolean(v.is_default) !== Boolean(defaults.is_default)) return true;
  if (Boolean(v.is_active) !== Boolean(defaults.is_active)) return true;
  if (String(v.notes ?? "").trim() !== String(defaults.notes ?? "").trim()) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  if (String(v.code ?? "").trim() !== String(row.code ?? "").trim()) return true;
  if (String(v.name ?? "").trim() !== String(row.name ?? "").trim()) return true;
  if (String(v.type ?? "") !== String(row.type ?? "")) return true;
  const vCur = v.currency_id == null || v.currency_id === "" ? null : Number(v.currency_id);
  const rCur = row.currency_id == null ? null : Number(row.currency_id);
  if (vCur !== rCur) return true;
  if (Boolean(v.requires_reference) !== Boolean(row.requires_reference)) return true;
  if (Boolean(v.supports_change) !== Boolean(row.supports_change)) return true;
  if (Boolean(v.is_default) !== Boolean(row.is_default)) return true;
  if (Boolean(v.is_active) !== Boolean(row.is_active)) return true;
  if (String(v.notes ?? "").trim() !== String(row.notes ?? "").trim()) return true;
  return false;
}

/**
 * @param {string} code
 * @param {string} name
 */
export function requiredFieldsValid(code, name) {
  return Boolean(String(code ?? "").trim() && String(name ?? "").trim());
}

/** @param {Record<string, unknown>} row */
export function toPaymentMethodCacheRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    currency_id: row.currency_id,
    currency_code: row.currency_code,
    currency_name: row.currency_name,
    requires_reference: Boolean(row.requires_reference),
    supports_change: Boolean(row.supports_change),
    is_default: Boolean(row.is_default),
    is_active: Boolean(row.is_active),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortPaymentMethodsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function paymentMethodFormValuesToPayload(values) {
  const notes = String(values.notes ?? "").trim();
  const cur = values.currency_id;
  return {
    code: String(values.code ?? "").trim(),
    name: String(values.name ?? "").trim(),
    type: String(values.type ?? "cash"),
    currency_id: cur == null || cur === "" ? null : Number(cur),
    requires_reference: Boolean(values.requires_reference),
    supports_change: Boolean(values.supports_change),
    is_default: Boolean(values.is_default),
    is_active: Boolean(values.is_active),
    notes: notes === "" ? null : notes,
  };
}
