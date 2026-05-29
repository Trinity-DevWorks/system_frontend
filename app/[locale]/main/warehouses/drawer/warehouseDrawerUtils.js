/*
 * Plain helper functions and small constants for the warehouse drawer (no React).
 * Payload mapping, dirty checks, sort order, and create-save intent storage keys.
 */

/** @typedef {"keep" | "new" | "close"} WarehouseCreateSaveIntent */

export const WAREHOUSE_CREATE_SAVE_INTENT_KEY = "warehouseDrawer:createSaveIntent";
export const WAREHOUSE_CREATE_SAVE_INTENT_EVENT = "warehouseDrawer:createSaveIntent:change";

const SHORTCUT_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/** @type {(keyof WarehouseDefaultFormFlags)[]} */
const DEFAULT_FLAG_KEYS = [
  "is_default",
  "is_default_sales",
  "is_default_production",
  "is_default_purchase",
  "is_default_storage",
];

/**
 * @typedef {{
 *   is_default: boolean;
 *   is_default_sales: boolean;
 *   is_default_production: boolean;
 *   is_default_purchase: boolean;
 *   is_default_storage: boolean;
 * }} WarehouseDefaultFormFlags
 */

/**
 * @param {Record<string, unknown>} values
 * @returns {WarehouseDefaultFormFlags}
 */
function readDefaultFlags(values) {
  return {
    is_default: Boolean(values.is_default),
    is_default_sales: Boolean(values.is_default_sales),
    is_default_production: Boolean(values.is_default_production),
    is_default_purchase: Boolean(values.is_default_purchase),
    is_default_storage: Boolean(values.is_default_storage),
  };
}

/**
 * @param {WarehouseDefaultFormFlags} a
 * @param {WarehouseDefaultFormFlags} b
 */
function defaultFlagsEqual(a, b) {
  return DEFAULT_FLAG_KEYS.every((key) => Boolean(a[key]) === Boolean(b[key]));
}

/**
 * @param {import("antd").FormInstance} form
 * @param {{
 *   name: string;
 *   shortcut_name: string;
 *   is_active: boolean;
 * } & WarehouseDefaultFormFlags} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const name = String(v.name ?? "").trim();
  const shortcutName = String(v.shortcut_name ?? "").trim().toUpperCase();
  const isActive = v.is_active !== false;
  const flags = readDefaultFlags(v);

  if (name !== String(defaults.name ?? "").trim()) return true;
  if (shortcutName !== String(defaults.shortcut_name ?? "").trim().toUpperCase()) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  if (!defaultFlagsEqual(flags, defaults)) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const name = String(v.name ?? "").trim();
  const shortcutName = String(v.shortcut_name ?? "").trim().toUpperCase();
  const isActive = v.is_active !== false;
  const flags = readDefaultFlags(v);
  const rowFlags = readDefaultFlags(row);

  if (name !== String(row.name ?? "").trim()) return true;
  if (shortcutName !== String(row.shortcut_name ?? "").trim().toUpperCase()) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  if (!defaultFlagsEqual(flags, rowFlags)) return true;
  return false;
}

/**
 * @param {string} name
 * @param {string} shortcutName
 */
export function requiredFieldsValid(name, shortcutName) {
  const n = String(name ?? "").trim();
  const s = String(shortcutName ?? "").trim().toUpperCase();
  if (!n || !s) return false;
  if (!SHORTCUT_PATTERN.test(s)) return false;
  return true;
}

/** @param {Record<string, unknown>} row */
export function toWarehouseCacheRow(row) {
  return {
    id: row.id,
    name: row.name,
    shortcut_name: row.shortcut_name,
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    is_default_sales: Boolean(row.is_default_sales),
    is_default_production: Boolean(row.is_default_production),
    is_default_purchase: Boolean(row.is_default_purchase),
    is_default_storage: Boolean(row.is_default_storage),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortWarehousesByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function warehouseFormValuesToPayload(values) {
  const flags = readDefaultFlags(values);
  return {
    name: String(values.name ?? "").trim(),
    shortcut_name: String(values.shortcut_name ?? "").trim().toUpperCase(),
    is_active: Boolean(values.is_active),
    ...flags,
  };
}
