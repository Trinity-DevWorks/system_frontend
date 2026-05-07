/*
 * Plain helper functions and small constants for the unit of measurement drawer (no React).
 */

/** @typedef {"keep" | "new" | "close"} UnitOfMeasurementCreateSaveIntent */

export const UOM_CREATE_SAVE_INTENT_KEY = "unitOfMeasurementDrawer:createSaveIntent";
export const UOM_CREATE_SAVE_INTENT_EVENT = "unitOfMeasurementDrawer:createSaveIntent:change";

const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * @param {import("antd").FormInstance} form
 * @param {{ unit_group_id?: number; code: string; name: string; symbol: string; decimal_places: number; is_active: boolean }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const unitGroupId = v.unit_group_id;
  const code = String(v.code ?? "").trim().toUpperCase();
  const name = String(v.name ?? "").trim();
  const symbol = String(v.symbol ?? "").trim();
  const decimalPlaces = Number(v.decimal_places);
  const isActive = v.is_active !== false;

  if (unitGroupId !== defaults.unit_group_id && !(unitGroupId == null && defaults.unit_group_id == null)) return true;
  if (code !== String(defaults.code ?? "").trim().toUpperCase()) return true;
  if (name !== String(defaults.name ?? "").trim()) return true;
  if (symbol !== String(defaults.symbol ?? "").trim()) return true;
  if (decimalPlaces !== Number(defaults.decimal_places ?? 0)) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const unitGroupId = Number(v.unit_group_id);
  const code = String(v.code ?? "").trim().toUpperCase();
  const name = String(v.name ?? "").trim();
  const symbol = String(v.symbol ?? "").trim();
  const decimalPlaces = Number(v.decimal_places);
  const isActive = v.is_active !== false;

  if (unitGroupId !== Number(row.unit_group_id)) return true;
  if (code !== String(row.code ?? "").trim().toUpperCase()) return true;
  if (name !== String(row.name ?? "").trim()) return true;
  if (symbol !== String(row.symbol ?? "").trim()) return true;
  if (decimalPlaces !== Number(row.decimal_places ?? 0)) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  return false;
}

/**
 * @param {number | undefined} unitGroupId
 * @param {string} code
 * @param {string} name
 * @param {number | string} decimalPlaces
 */
export function requiredFieldsValid(unitGroupId, code, name, decimalPlaces) {
  if (unitGroupId == null || !Number.isFinite(Number(unitGroupId))) return false;
  const c = String(code ?? "").trim().toUpperCase();
  const n = String(name ?? "").trim();
  const d = Number(decimalPlaces);
  if (!c || !n || !Number.isFinite(d)) return false;
  if (!CODE_PATTERN.test(c)) return false;
  if (d < 0 || d > 6) return false;
  return true;
}

/** @param {Record<string, unknown>} row */
export function toUnitOfMeasurementCacheRow(row) {
  return {
    id: row.id,
    unit_group_id: row.unit_group_id,
    unit_group: row.unit_group && typeof row.unit_group === "object" ? row.unit_group : null,
    code: row.code,
    name: row.name,
    symbol: row.symbol ?? null,
    decimal_places: row.decimal_places,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortUnitOfMeasurementsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function unitOfMeasurementFormValuesToPayload(values) {
  const rawSymbol = String(values.symbol ?? "").trim();
  return {
    unit_group_id: Number(values.unit_group_id),
    code: String(values.code ?? "").trim().toUpperCase(),
    name: String(values.name ?? "").trim(),
    symbol: rawSymbol === "" ? null : rawSymbol,
    decimal_places: Number(values.decimal_places),
    is_active: Boolean(values.is_active),
  };
}
