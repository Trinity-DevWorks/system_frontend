/*
 * Plain helper functions and small constants for the user drawer (no React).
 */

/** @typedef {"keep" | "new" | "close"} UserCreateSaveIntent */

export const USER_CREATE_SAVE_INTENT_KEY = "userDrawer:createSaveIntent";
export const USER_CREATE_SAVE_INTENT_EVENT = "userDrawer:createSaveIntent:change";

/** Select sentinels for nested create drawers (not real relation ids). */
export const USER_LOOKUP_ADD_BRANCH = "__user_drawer_add_branch__";
export const USER_LOOKUP_ADD_ROLE = "__user_drawer_add_role__";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {unknown} left
 * @param {unknown} right
 */
function branchAssignmentsEqual(left, right) {
  const normalize = (value) =>
    [...(Array.isArray(value) ? value : [])]
      .map((row) => ({
        branch_id: Number(/** @type {{ branch_id?: unknown }} */ (row)?.branch_id),
        role_id: Number(/** @type {{ role_id?: unknown }} */ (row)?.role_id),
      }))
      .filter((row) => !Number.isNaN(row.branch_id) && !Number.isNaN(row.role_id))
      .sort((a, b) => a.branch_id - b.branch_id || a.role_id - b.role_id);

  const a = normalize(left);
  const b = normalize(right);
  if (a.length !== b.length) return false;
  return a.every(
    (row, index) => row.branch_id === b[index].branch_id && row.role_id === b[index].role_id,
  );
}

/**
 * @param {string} email
 */
export function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email ?? "").trim());
}

/**
 * @param {unknown} assignments
 * @returns {Array<{ branch_id: number; role_id: number }>}
 */
export function normalizeBranchAssignments(assignments) {
  if (!Array.isArray(assignments)) return [];
  const byBranch = new Map();
  for (const row of assignments) {
    if (!row || typeof row !== "object") continue;
    const branchId = Number(/** @type {{ branch_id?: unknown }} */ (row).branch_id);
    const roleId = Number(/** @type {{ role_id?: unknown }} */ (row).role_id);
    if (Number.isNaN(branchId) || Number.isNaN(roleId)) continue;
    byBranch.set(branchId, { branch_id: branchId, role_id: roleId });
  }
  return [...byBranch.values()].sort((a, b) => a.branch_id - b.branch_id);
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Array<{ branch_id: number; role_id: number }>}
 */
export function branchAssignmentsFromUserRow(row) {
  if (Array.isArray(row.branch_assignments) && row.branch_assignments.length > 0) {
    return normalizeBranchAssignments(row.branch_assignments);
  }

  if (Array.isArray(row.branches)) {
    return normalizeBranchAssignments(
      row.branches.map((branch) => ({
        branch_id: /** @type {{ id?: unknown }} */ (branch)?.id,
        role_id:
          /** @type {{ role_id?: unknown; role?: { id?: unknown } }} */ (branch)?.role_id ??
          /** @type {{ role?: { id?: unknown } }} */ (branch)?.role?.id,
      })),
    );
  }

  return [];
}

/**
 * @param {string} name
 * @param {string} email
 * @param {Array<{ branch_id?: number; role_id?: number }> | null | undefined} branchAssignments
 * @param {"create" | "edit"} mode
 * @param {string} password
 * @param {string} passwordConfirmation
 */
export function requiredFieldsValid(name, email, branchAssignments, mode, password, passwordConfirmation) {
  const n = String(name ?? "").trim();
  const e = String(email ?? "").trim();
  if (!n || !e || !isValidEmail(e)) return false;

  const assignments = normalizeBranchAssignments(branchAssignments);
  if (assignments.length < 1) return false;
  if (assignments.some((row) => row.role_id == null || Number.isNaN(Number(row.role_id)))) return false;

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
 * @param {{ name: string; email: string; branch_assignments: Array<{ branch_id: number; role_id: number }>; active: boolean; password: string; password_confirmation: string }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const name = String(v.name ?? "").trim();
  const email = String(v.email ?? "").trim();
  const password = String(v.password ?? "");
  const passwordConfirmation = String(v.password_confirmation ?? "");
  const isActive = v.active !== false;
  const branchAssignments = v.branch_assignments ?? [];

  if (name !== String(defaults.name ?? "").trim()) return true;
  if (email !== String(defaults.email ?? "").trim()) return true;
  if (!branchAssignmentsEqual(branchAssignments, defaults.branch_assignments)) return true;
  if (isActive !== Boolean(defaults.active)) return true;
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
  const isActive = v.active !== false;
  const branchAssignments = v.branch_assignments ?? [];
  const loadedAssignments = branchAssignmentsFromUserRow(row);

  if (name !== String(row.name ?? "").trim()) return true;
  if (email !== String(row.email ?? "").trim()) return true;
  if (!branchAssignmentsEqual(branchAssignments, loadedAssignments)) return true;
  if (isActive !== Boolean(row.active)) return true;
  if (password !== "" || passwordConfirmation !== "") return true;
  return false;
}

/** @param {Record<string, unknown>} row */
export function toUserCacheRow(row) {
  const role = row.role && typeof row.role === "object" ? /** @type {{ id?: number; name?: string }} */ (row.role) : null;
  const branches = Array.isArray(row.branches)
    ? row.branches.filter((branch) => branch && typeof branch === "object")
    : [];
  const branchAssignments = branchAssignmentsFromUserRow(row);
  const branchIds = branchAssignments.map((rowAssignment) => rowAssignment.branch_id);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    active: row.active,
    role_id: role?.id ?? row.role_id ?? null,
    role: role ? { id: role.id, name: role.name } : null,
    branches,
    branch_ids: branchIds,
    branch_assignments: branchAssignments,
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
    active: Boolean(values.active),
    branch_assignments: normalizeBranchAssignments(values.branch_assignments),
  };

  const password = String(values.password ?? "");
  const passwordConfirmation = String(values.password_confirmation ?? "");

  if (mode === "create" || password !== "") {
    payload.password = password;
    payload.password_confirmation = passwordConfirmation;
  }

  return payload;
}
