/*
 * Plain helper functions and small constants for the VAT group drawer (no React).
 * Payload mapping, dirty checks, and create-save intent storage keys.
 */

/** @typedef {"keep" | "new" | "close"} VatGroupCreateSaveIntent */

export const VAT_GROUP_CREATE_SAVE_INTENT_KEY = "vatGroupDrawer:createSaveIntent";
export const VAT_GROUP_CREATE_SAVE_INTENT_EVENT = "vatGroupDrawer:createSaveIntent:change";

const ABRV_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * @param {import("antd").FormInstance} form
 * @param {{ abrv: string; name: string; percentage: number; is_default: boolean; is_active: boolean }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const abrv = String(v.abrv ?? "").trim().toUpperCase();
  const name = String(v.name ?? "").trim();
  const percentage = Number(v.percentage);
  const isDefault = Boolean(v.is_default);
  const isActive = v.is_active !== false;

  if (abrv !== String(defaults.abrv ?? "").trim().toUpperCase()) return true;
  if (name !== String(defaults.name ?? "").trim()) return true;
  if (percentage !== Number(defaults.percentage ?? 0)) return true;
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
  const abrv = String(v.abrv ?? "").trim().toUpperCase();
  const name = String(v.name ?? "").trim();
  const percentage = Number(v.percentage);
  const isDefault = Boolean(v.is_default);
  const isActive = v.is_active !== false;

  if (abrv !== String(row.abrv ?? "").trim().toUpperCase()) return true;
  if (name !== String(row.name ?? "").trim()) return true;
  if (percentage !== Number(row.percentage ?? 0)) return true;
  if (isDefault !== Boolean(row.is_default)) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  return false;
}

/**
 * @param {string} abrv
 * @param {string} name
 * @param {number | string} percentage
 */
export function requiredFieldsValid(abrv, name, percentage) {
  const a = String(abrv ?? "").trim().toUpperCase();
  const n = String(name ?? "").trim();
  const p = Number(percentage);
  if (!a || !n || !Number.isFinite(p)) return false;
  if (!ABRV_PATTERN.test(a)) return false;
  if (p < 0 || p > 100) return false;
  return true;
}

/** @param {Record<string, unknown>} row */
export function toVatGroupCacheRow(row) {
  return {
    id: row.id,
    abrv: row.abrv,
    name: row.name,
    percentage: row.percentage,
    is_default: Boolean(row.is_default),
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortVatGroupsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function vatGroupFormValuesToPayload(values) {
  return {
    abrv: String(values.abrv ?? "").trim().toUpperCase(),
    name: String(values.name ?? "").trim(),
    percentage: Number(values.percentage),
    is_default: Boolean(values.is_default),
    is_active: values.is_active !== false,
  };
}
