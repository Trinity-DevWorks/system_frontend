/*
 * Plain helper functions and small constants for the central role drawer (no React).
 */

export const CENTRAL_ROLE_CREATE_SAVE_INTENT_KEY = "centralRoleDrawer:createSaveIntent";
export const CENTRAL_ROLE_CREATE_SAVE_INTENT_EVENT = "centralRoleDrawer:createSaveIntent:change";

export const CENTRAL_ROLE_DEFAULTS = Object.freeze({
  name: "",
  description: "",
  is_active: true,
});

/**
 * System roles (Super Admin) are immutable: no rename, no delete, no matrix edit.
 * @param {unknown} row
 */
export function isSystemCentralRole(row) {
  return Boolean(row && typeof row === "object" && /** @type {{ is_system?: unknown }} */ (row).is_system);
}

/**
 * @param {string} name
 */
export function requiredFieldsValid(name) {
  return String(name ?? "").trim().length > 0;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {{ name: string; description: string; is_active: boolean }} baseline
 */
export function isRoleFormDirty(form, baseline) {
  const v = form.getFieldsValue(true);
  if (String(v.name ?? "").trim() !== String(baseline.name ?? "").trim()) return true;
  if (String(v.description ?? "").trim() !== String(baseline.description ?? "").trim()) return true;
  return (v.is_active !== false) !== Boolean(baseline.is_active);
}

/** @param {Record<string, unknown>} row */
export function toCentralRoleCacheRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    is_active: row.is_active,
    is_system: Boolean(row.is_system),
    users_count: row.users_count ?? null,
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
  const description =
    typeof values.description === "string" && values.description.trim() !== ""
      ? values.description.trim()
      : null;

  return {
    name: String(values.name ?? "").trim(),
    description,
    is_active: Boolean(values.is_active),
  };
}
