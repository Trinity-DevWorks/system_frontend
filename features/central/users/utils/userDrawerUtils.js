/*
 * Plain helper functions and small constants for the central user drawer (no React).
 */

export const CENTRAL_USER_CREATE_SAVE_INTENT_KEY = "centralUserDrawer:createSaveIntent";
export const CENTRAL_USER_CREATE_SAVE_INTENT_EVENT = "centralUserDrawer:createSaveIntent:change";

export const CENTRAL_USER_DEFAULTS = Object.freeze({
  name: "",
  email: "",
  central_role_id: undefined,
  is_active: true,
  password: "",
  password_confirmation: "",
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @param {string} email */
export function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email ?? "").trim());
}

/**
 * @param {{
 *   name: string;
 *   email: string;
 *   roleId: unknown;
 *   mode: "create" | "edit";
 *   password: string;
 *   passwordConfirmation: string;
 * }} values
 */
export function requiredFieldsValid({ name, email, roleId, mode, password, passwordConfirmation }) {
  const n = String(name ?? "").trim();
  const e = String(email ?? "").trim();
  if (!n || !e || !isValidEmail(e)) return false;
  if (roleId == null || Number.isNaN(Number(roleId))) return false;

  const pwd = String(password ?? "");
  const confirm = String(passwordConfirmation ?? "");
  if (mode === "create") {
    return pwd.length >= 8 && pwd === confirm;
  }
  if (pwd === "" && confirm === "") return true;
  return pwd.length >= 8 && pwd === confirm;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} baseline
 */
export function isCreateDirtyVsDefaults(form, baseline) {
  const v = form.getFieldsValue(true);
  if (String(v.name ?? "").trim() !== String(baseline.name ?? "").trim()) return true;
  if (String(v.email ?? "").trim() !== String(baseline.email ?? "").trim()) return true;
  if ((v.central_role_id ?? null) !== (baseline.central_role_id ?? null)) return true;
  if ((v.is_active !== false) !== Boolean(baseline.is_active)) return true;
  if (String(v.password ?? "") !== String(baseline.password ?? "")) return true;
  return String(v.password_confirmation ?? "") !== String(baseline.password_confirmation ?? "");
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  if (String(v.name ?? "").trim() !== String(row.name ?? "").trim()) return true;
  if (String(v.email ?? "").trim() !== String(row.email ?? "").trim()) return true;
  if (Number(v.central_role_id) !== Number(row.central_role_id)) return true;
  if ((v.is_active !== false) !== Boolean(row.is_active)) return true;
  return String(v.password ?? "") !== "" || String(v.password_confirmation ?? "") !== "";
}

/** @param {Record<string, unknown>} row */
export function toCentralUserCacheRow(row) {
  const role =
    row.role && typeof row.role === "object"
      ? /** @type {{ id?: number; name?: string; is_system?: boolean }} */ (row.role)
      : null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    is_active: row.is_active,
    central_role_id: row.central_role_id ?? role?.id ?? null,
    role: role ? { id: role.id, name: role.name, is_system: Boolean(role.is_system) } : null,
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
  /** @type {Record<string, unknown>} */
  const payload = {
    name: String(values.name ?? "").trim(),
    email: String(values.email ?? "").trim(),
    is_active: Boolean(values.is_active),
    central_role_id: Number(values.central_role_id),
  };

  const password = String(values.password ?? "");
  if (mode === "create" || password !== "") {
    payload.password = password;
    payload.password_confirmation = String(values.password_confirmation ?? "");
  }

  return payload;
}
