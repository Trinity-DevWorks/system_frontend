/*
 * Plain helper functions and small constants for the user drawer (no React).
 */

/** @typedef {"keep" | "new" | "close"} UserCreateSaveIntent */

export const USER_CREATE_SAVE_INTENT_KEY = "userDrawer:createSaveIntent";
export const USER_CREATE_SAVE_INTENT_EVENT = "userDrawer:createSaveIntent:change";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} email
 */
export function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email ?? "").trim());
}

/**
 * @param {string} name
 * @param {string} email
 * @param {number | null | undefined} roleId
 * @param {"create" | "edit"} mode
 * @param {string} password
 * @param {string} passwordConfirmation
 */
export function requiredFieldsValid(name, email, roleId, mode, password, passwordConfirmation) {
  const n = String(name ?? "").trim();
  const e = String(email ?? "").trim();
  if (!n || !e || !isValidEmail(e)) return false;
  if (roleId == null || Number.isNaN(Number(roleId))) return false;

  const pwd = String(password ?? "");
  const confirm = String(passwordConfirmation ?? "");

  if (mode === "create") {
    if (pwd.length < 8) return false;
    return pwd === confirm;
  }

  if (pwd === "" && confirm === "") return true;
  if (pwd.length < 8) return false;
  return pwd === confirm;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {{ name: string; email: string; role_id: number | null; is_active: boolean; password: string; password_confirmation: string }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const name = String(v.name ?? "").trim();
  const email = String(v.email ?? "").trim();
  const password = String(v.password ?? "");
  const passwordConfirmation = String(v.password_confirmation ?? "");
  const isActive = v.is_active !== false;
  const roleId = v.role_id ?? null;

  if (name !== String(defaults.name ?? "").trim()) return true;
  if (email !== String(defaults.email ?? "").trim()) return true;
  if (Number(roleId) !== Number(defaults.role_id)) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  if (password !== String(defaults.password ?? "")) return true;
  if (passwordConfirmation !== String(defaults.password_confirmation ?? "")) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const name = String(v.name ?? "").trim();
  const email = String(v.email ?? "").trim();
  const password = String(v.password ?? "");
  const passwordConfirmation = String(v.password_confirmation ?? "");
  const isActive = v.is_active !== false;
  const roleId = v.role_id ?? null;
  const loadedRoleId = row.role_id ?? row.role?.id ?? null;

  if (name !== String(row.name ?? "").trim()) return true;
  if (email !== String(row.email ?? "").trim()) return true;
  if (Number(roleId) !== Number(loadedRoleId)) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  if (password !== "" || passwordConfirmation !== "") return true;
  return false;
}

/** @param {Record<string, unknown>} row */
export function toUserCacheRow(row) {
  const role = row.role && typeof row.role === "object" ? /** @type {{ id?: number; name?: string }} */ (row.role) : null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    is_active: row.is_active,
    role_id: role?.id ?? row.role_id ?? null,
    role: role ? { id: role.id, name: role.name } : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortUsersByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/**
 * @param {Record<string, unknown>} values
 * @param {"create" | "edit"} mode
 */
export function userFormValuesToPayload(values, mode) {
  const payload = {
    name: String(values.name ?? "").trim(),
    email: String(values.email ?? "").trim(),
    is_active: Boolean(values.is_active),
    role_id: Number(values.role_id),
  };

  const password = String(values.password ?? "");
  const passwordConfirmation = String(values.password_confirmation ?? "");

  if (mode === "create" || password !== "") {
    payload.password = password;
    payload.password_confirmation = passwordConfirmation;
  }

  return payload;
}
