/*
 * Plain helper functions and small constants for the supplier group drawer (no React).
 */

/** @typedef {"keep" | "new" | "close"} SupplierGroupCreateSaveIntent */

export const SUPPLIER_GROUP_CREATE_SAVE_INTENT_KEY = "supplierGroupDrawer:createSaveIntent";
export const SUPPLIER_GROUP_CREATE_SAVE_INTENT_EVENT = "supplierGroupDrawer:createSaveIntent:change";

const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * @param {import("antd").FormInstance} form
 * @param {{ code: string; name: string; is_active: boolean }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const code = String(v.code ?? "").trim().toUpperCase();
  const name = String(v.name ?? "").trim();
  const isActive = v.is_active !== false;

  if (code !== String(defaults.code ?? "").trim().toUpperCase()) return true;
  if (name !== String(defaults.name ?? "").trim()) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const code = String(v.code ?? "").trim().toUpperCase();
  const name = String(v.name ?? "").trim();
  const isActive = v.is_active !== false;

  if (code !== String(row.code ?? "").trim().toUpperCase()) return true;
  if (name !== String(row.name ?? "").trim()) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  return false;
}

/**
 * @param {string} code
 * @param {string} name
 */
export function requiredFieldsValid(code, name) {
  const c = String(code ?? "").trim().toUpperCase();
  const n = String(name ?? "").trim();
  if (!c || !n) return false;
  if (!CODE_PATTERN.test(c)) return false;
  return true;
}

/** @param {Record<string, unknown>} row */
export function toSupplierGroupCacheRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    is_active: row.is_active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortSupplierGroupsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function supplierGroupFormValuesToPayload(values) {
  return {
    code: String(values.code ?? "").trim().toUpperCase(),
    name: String(values.name ?? "").trim(),
    is_active: values.is_active !== false,
  };
}
