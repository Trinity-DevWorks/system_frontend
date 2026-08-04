/*
 * Plain helper functions and small constants for the branch drawer (no React).
 * Payload mapping, dirty checks, sort order, and create-save intent storage keys.
 */

/** @typedef {"keep" | "new" | "close"} BranchCreateSaveIntent */

export const BRANCH_CREATE_SAVE_INTENT_KEY = "branchDrawer:createSaveIntent";
export const BRANCH_CREATE_SAVE_INTENT_EVENT = "branchDrawer:createSaveIntent:change";

const SHORTCUT_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * @param {import("antd").FormInstance} form
 * @param {{
 *   name: string;
 *   shortcut_name: string;
 *   address: string;
 *   phone: string;
 *   timezone: string;
 *   manager_name: string;
 *   is_active: boolean;
 *   is_default: boolean;
 * }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const name = String(v.name ?? "").trim();
  const shortcutName = String(v.shortcut_name ?? "").trim().toUpperCase();
  const address = String(v.address ?? "").trim();
  const phone = String(v.phone ?? "").trim();
  const timezone = String(v.timezone ?? "").trim();
  const managerName = String(v.manager_name ?? "").trim();
  const isActive = v.is_active !== false;
  const isDefault = Boolean(v.is_default);

  if (name !== String(defaults.name ?? "").trim()) return true;
  if (shortcutName !== String(defaults.shortcut_name ?? "").trim().toUpperCase()) return true;
  if (address !== String(defaults.address ?? "").trim()) return true;
  if (phone !== String(defaults.phone ?? "").trim()) return true;
  if (timezone !== String(defaults.timezone ?? "").trim()) return true;
  if (managerName !== String(defaults.manager_name ?? "").trim()) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  if (isDefault !== Boolean(defaults.is_default)) return true;
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
  const address = String(v.address ?? "").trim();
  const phone = String(v.phone ?? "").trim();
  const timezone = String(v.timezone ?? "").trim();
  const managerName = String(v.manager_name ?? "").trim();
  const isActive = v.is_active !== false;
  const isDefault = Boolean(v.is_default);

  if (name !== String(row.name ?? "").trim()) return true;
  if (shortcutName !== String(row.shortcut_name ?? "").trim().toUpperCase()) return true;
  if (address !== String(row.address ?? "").trim()) return true;
  if (phone !== String(row.phone ?? "").trim()) return true;
  if (timezone !== String(row.timezone ?? "").trim()) return true;
  if (managerName !== String(row.manager_name ?? "").trim()) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  if (isDefault !== Boolean(row.is_default)) return true;
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
export function toBranchCacheRow(row) {
  return {
    id: row.id,
    name: row.name,
    shortcut_name: row.shortcut_name,
    address: row.address ?? null,
    phone: row.phone ?? null,
    timezone: row.timezone ?? null,
    manager_name: row.manager_name ?? null,
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortBranchesByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function branchFormValuesToPayload(values) {
  const trimOrNull = (value) => {
    const s = String(value ?? "").trim();
    return s === "" ? null : s;
  };

  return {
    name: String(values.name ?? "").trim(),
    shortcut_name: String(values.shortcut_name ?? "").trim().toUpperCase(),
    address: trimOrNull(values.address),
    phone: trimOrNull(values.phone),
    timezone: trimOrNull(values.timezone),
    manager_name: trimOrNull(values.manager_name),
    is_active: Boolean(values.is_active),
    is_default: Boolean(values.is_default),
  };
}
