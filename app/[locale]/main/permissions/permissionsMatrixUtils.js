import { isOwnerRoleName } from "../roles/drawer/roleDrawerUtils";

/** @typedef {"can_view" | "can_add" | "can_edit" | "can_delete" | "can_import" | "can_export"} PermFlag */

/** @type {readonly PermFlag[]} */
export const PERM_FLAGS = Object.freeze([
  "can_view",
  "can_add",
  "can_edit",
  "can_delete",
  "can_import",
  "can_export",
]);

/** Actions other than view — checking any of these implies view. */
const MUTATING_FLAGS = /** @type {const} */ ([
  "can_add",
  "can_edit",
  "can_delete",
  "can_import",
  "can_export",
]);

/**
 * @param {unknown} catalogRow
 * @returns {{ permission_id: number; resource_key: string; resource_label: string } | null}
 */
export function normalizeCatalogRow(catalogRow) {
  if (!catalogRow || typeof catalogRow !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (catalogRow);
  const id = Number(row.id);
  const key = typeof row.resource_key === "string" ? row.resource_key : "";
  if (!Number.isFinite(id) || !key) return null;
  return {
    permission_id: id,
    resource_key: key,
    resource_label:
      typeof row.resource_label === "string" && row.resource_label.trim()
        ? row.resource_label
        : key,
  };
}

/**
 * @param {unknown} rolePerm
 * @returns {Record<PermFlag, boolean>}
 */
function flagsFromRolePerm(rolePerm) {
  const src =
    rolePerm && typeof rolePerm === "object"
      ? /** @type {Record<string, unknown>} */ (rolePerm)
      : {};
  /** @type {Record<string, boolean>} */
  const out = {};
  for (const flag of PERM_FLAGS) {
    out[flag] = Boolean(src[flag]);
  }
  return /** @type {Record<PermFlag, boolean>} */ (out);
}

/**
 * Build editable matrix rows from catalog + role permission payload.
 *
 * @param {unknown[]} catalog
 * @param {unknown[] | null | undefined} rolePermissions
 * @returns {Array<{
 *   permission_id: number;
 *   resource_key: string;
 *   resource_label: string;
 *   can_view: boolean;
 *   can_add: boolean;
 *   can_edit: boolean;
 *   can_delete: boolean;
 *   can_import: boolean;
 *   can_export: boolean;
 * }>}
 */
export function buildMatrixRows(catalog, rolePermissions) {
  /** @type {Map<number, Record<string, unknown>>} */
  const byId = new Map();
  if (Array.isArray(rolePermissions)) {
    for (const item of rolePermissions) {
      if (!item || typeof item !== "object") continue;
      const row = /** @type {Record<string, unknown>} */ (item);
      const pid = Number(row.permission_id);
      if (Number.isFinite(pid)) byId.set(pid, row);
    }
  }

  const rows = [];
  for (const raw of catalog ?? []) {
    const meta = normalizeCatalogRow(raw);
    if (!meta) continue;
    const flags = flagsFromRolePerm(byId.get(meta.permission_id));
    rows.push({ ...meta, ...flags });
  }
  return rows;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function cloneMatrixRows(rows) {
  return rows.map((r) => ({ ...r }));
}

/**
 * @param {Array<Record<string, unknown>>} a
 * @param {Array<Record<string, unknown>>} b
 */
export function areMatrixRowsEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (Number(left.permission_id) !== Number(right.permission_id)) return false;
    for (const flag of PERM_FLAGS) {
      if (Boolean(left[flag]) !== Boolean(right[flag])) return false;
    }
  }
  return true;
}

/**
 * Apply a flag change with view-implication rules.
 *
 * @param {Record<string, unknown>} row
 * @param {PermFlag} flag
 * @param {boolean} checked
 */
export function applyFlagToRow(row, flag, checked) {
  const next = { ...row };
  if (flag === "can_view") {
    next.can_view = checked;
    if (!checked) {
      for (const f of MUTATING_FLAGS) {
        next[f] = false;
      }
    }
    return next;
  }

  next[flag] = checked;
  if (checked) {
    next.can_view = true;
  }
  return next;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {PermFlag} flag
 * @param {boolean} checked
 */
export function applyFlagToAllRows(rows, flag, checked) {
  return rows.map((row) => applyFlagToRow(row, flag, checked));
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {PermFlag} flag
 */
export function columnCheckState(rows, flag) {
  if (!rows.length) return { checked: false, indeterminate: false };
  let on = 0;
  for (const row of rows) {
    if (row[flag]) on += 1;
  }
  return {
    checked: on === rows.length,
    indeterminate: on > 0 && on < rows.length,
  };
}

/**
 * Payload for PUT roles/{id}/permissions
 * @param {Array<Record<string, unknown>>} rows
 */
export function matrixRowsToPayload(rows) {
  return rows.map((row) => ({
    permission_id: Number(row.permission_id),
    can_view: Boolean(row.can_view),
    can_add: Boolean(row.can_add),
    can_edit: Boolean(row.can_edit),
    can_delete: Boolean(row.can_delete),
    can_import: Boolean(row.can_import),
    can_export: Boolean(row.can_export),
  }));
}

/**
 * Prefer Admin, else first non-Owner, else first role.
 * @param {Array<{ id?: unknown; name?: unknown; is_active?: unknown }>} roles
 * @returns {number | null}
 */
export function pickDefaultRoleId(roles) {
  const list = Array.isArray(roles) ? roles : [];
  const active = list.filter((r) => r?.is_active !== false);
  const pool = active.length ? active : list;

  const admin = pool.find((r) => String(r?.name ?? "").trim() === "Admin");
  if (admin?.id != null) return Number(admin.id);

  const editable = pool.find((r) => !isOwnerRoleName(r?.name));
  if (editable?.id != null) return Number(editable.id);

  if (pool[0]?.id != null) return Number(pool[0].id);
  return null;
}
