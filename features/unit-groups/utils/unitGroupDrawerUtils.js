/*
 * Plain helper functions and small constants for the unit group drawer (no React).
 */

/** @typedef {"keep" | "new" | "close"} UnitGroupCreateSaveIntent */

export const UNIT_GROUP_CREATE_SAVE_INTENT_KEY = "unitGroupDrawer:createSaveIntent";
export const UNIT_GROUP_CREATE_SAVE_INTENT_EVENT = "unitGroupDrawer:createSaveIntent:change";

const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * @param {import("antd").FormInstance} form
 * @param {{ code: string; name: string; dimension_type: string; is_active: boolean }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const code = String(v.code ?? "").trim().toUpperCase();
  const name = String(v.name ?? "").trim();
  const dimensionType = String(v.dimension_type ?? "").trim().toLowerCase();
  const isActive = v.is_active !== false;

  if (code !== String(defaults.code ?? "").trim().toUpperCase()) return true;
  if (name !== String(defaults.name ?? "").trim()) return true;
  if (dimensionType !== String(defaults.dimension_type ?? "").trim().toLowerCase()) return true;
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
  const dimensionType = String(v.dimension_type ?? "").trim().toLowerCase();
  const isActive = v.is_active !== false;

  if (code !== String(row.code ?? "").trim().toUpperCase()) return true;
  if (name !== String(row.name ?? "").trim()) return true;
  if (dimensionType !== String(row.dimension_type ?? "").trim().toLowerCase()) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  return false;
}

/**
 * @param {string} code
 * @param {string} name
 * @param {string} dimensionType
 */
export function requiredFieldsValid(code, name, dimensionType) {
  const c = String(code ?? "").trim().toUpperCase();
  const n = String(name ?? "").trim();
  const d = String(dimensionType ?? "").trim().toLowerCase();
  if (!c || !n || !d) return false;
  if (!CODE_PATTERN.test(c)) return false;
  return true;
}

/** @param {Record<string, unknown>} row */
export function toUnitGroupCacheRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    dimension_type: row.dimension_type,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortUnitGroupsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function unitGroupFormValuesToPayload(values) {
  return {
    code: String(values.code ?? "").trim().toUpperCase(),
    name: String(values.name ?? "").trim(),
    dimension_type: String(values.dimension_type ?? "").trim().toLowerCase(),
    is_active: Boolean(values.is_active),
  };
}
