/*
 * Payment term drawer helpers (no React).
 */

export const PAYMENT_TERM_CREATE_SAVE_INTENT_KEY = "paymentTermDrawer:createSaveIntent";
export const PAYMENT_TERM_CREATE_SAVE_INTENT_EVENT = "paymentTermDrawer:createSaveIntent:change";

/**
 * @param {import("antd").FormInstance} form
 * @param {{ code: string; name: string; due_days: number; description?: string; is_default: boolean; is_active: boolean }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const code = String(v.code ?? "").trim();
  const name = String(v.name ?? "").trim();
  const dueDays = Number(v.due_days);
  const description = String(v.description ?? "").trim();
  const isDefault = Boolean(v.is_default);
  const isActive = v.is_active !== false;

  if (code !== String(defaults.code ?? "").trim()) return true;
  if (name !== String(defaults.name ?? "").trim()) return true;
  if (dueDays !== Number(defaults.due_days ?? 0)) return true;
  if (description !== String(defaults.description ?? "").trim()) return true;
  if (isDefault !== Boolean(defaults.is_default)) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const code = String(v.code ?? "").trim();
  const name = String(v.name ?? "").trim();
  const dueDays = Number(v.due_days);
  const description = String(v.description ?? "").trim();
  const isDefault = Boolean(v.is_default);
  const isActive = v.is_active !== false;

  if (code !== String(row.code ?? "").trim()) return true;
  if (name !== String(row.name ?? "").trim()) return true;
  if (dueDays !== Number(row.due_days ?? 0)) return true;
  if (description !== String(row.description ?? "").trim()) return true;
  if (isDefault !== Boolean(row.is_default)) return true;
  if (isActive !== Boolean(row.is_active)) return true;
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
export function toPaymentTermCacheRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    due_days: row.due_days,
    description: row.description,
    is_default: Boolean(row.is_default),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortPaymentTermsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function paymentTermFormValuesToPayload(values) {
  const desc = String(values.description ?? "").trim();
  return {
    code: String(values.code ?? "").trim(),
    name: String(values.name ?? "").trim(),
    due_days: Math.min(65535, Math.max(0, Math.round(Number(values.due_days)))),
    description: desc === "" ? null : desc,
    is_default: Boolean(values.is_default),
    is_active: Boolean(values.is_active),
  };
}
