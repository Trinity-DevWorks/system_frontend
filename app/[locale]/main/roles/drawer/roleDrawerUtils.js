/*
 * Plain helper functions and small constants for the role drawer (no React).
 */

/** @typedef {"keep" | "new" | "close"} RoleCreateSaveIntent */

export const ROLE_CREATE_SAVE_INTENT_KEY = "roleDrawer:createSaveIntent";
export const ROLE_CREATE_SAVE_INTENT_EVENT = "roleDrawer:createSaveIntent:change";

export const SYSTEM_ROLE_NAMES = new Set(["Owner", "Admin"]);

/**
 * @param {string} name
 */
export function isSystemRoleName(name) {
  return SYSTEM_ROLE_NAMES.has(String(name ?? "").trim());
}

/**
 * @param {string} name
 */
export function requiredFieldsValid(name) {
  return String(name ?? "").trim().length > 0;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {{ name: string; description: string; is_active: boolean }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const name = String(v.name ?? "").trim();
  const description = String(v.description ?? "").trim();
  const isActive = v.is_active !== false;

  if (name !== String(defaults.name ?? "").trim()) return true;
  if (description !== String(defaults.description ?? "").trim()) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const name = String(v.name ?? "").trim();
  const description = String(v.description ?? "").trim();
  const isActive = v.is_active !== false;
  const rowDesc = row.description == null ? "" : String(row.description).trim();

  if (name !== String(row.name ?? "").trim()) return true;
  if (description !== rowDesc) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  return false;
}

/** @param {Record<string, unknown>} row */
export function toRoleCacheRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortRolesByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function roleFormValuesToPayload(values) {
  const description = (() => {
    const d = values.description;
    if (d == null || typeof d !== "string") return null;
    const trimmed = d.trim();
    return trimmed === "" ? null : trimmed;
  })();

  return {
    name: String(values.name ?? "").trim(),
    description,
    is_active: Boolean(values.is_active),
  };
}
