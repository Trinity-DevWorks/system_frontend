import { isOwnerRoleName } from "@/features/roles/index";

/** @typedef {"can_view" | "can_add" | "can_edit" | "can_delete" | "can_import" | "can_export"} PermFlag */
/** @typedef {"view" | "add" | "edit" | "delete" | "import" | "export"} PermAction */

/** @type {readonly PermFlag[]} */
export const PERM_FLAGS = Object.freeze([
  "can_view",
  "can_add",
  "can_edit",
  "can_delete",
  "can_import",
  "can_export",
]);

/** @type {readonly PermAction[]} */
export const PERM_ACTIONS = Object.freeze([
  "view",
  "add",
  "edit",
  "delete",
  "import",
  "export",
]);

/** @type {Readonly<Record<PermFlag, PermAction>>} */
export const FLAG_TO_ACTION = Object.freeze({
  can_view: "view",
  can_add: "add",
  can_edit: "edit",
  can_delete: "delete",
  can_import: "import",
  can_export: "export",
});

/**
 * @param {unknown} raw
 * @returns {PermAction[]}
 */
function normalizeActions(raw) {
  if (!Array.isArray(raw)) {
    return [...PERM_ACTIONS];
  }
  /** @type {PermAction[]} */
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (typeof item !== "string" || seen.has(item)) continue;
    if (!PERM_ACTIONS.includes(/** @type {PermAction} */ (item))) continue;
    seen.add(item);
    out.push(/** @type {PermAction} */ (item));
  }
  return out.length ? out : [...PERM_ACTIONS];
}

/**
 * @param {Record<string, unknown>} row
 * @param {PermFlag} flag
 */
export function rowAllowsFlag(row, flag) {
  const action = FLAG_TO_ACTION[flag];
  const actions = Array.isArray(row.actions) ? row.actions : PERM_ACTIONS;
  return actions.includes(action);
}

/**
 * @param {unknown} catalogRow
 * @returns {{ permission_id: number; resource_key: string; resource_label: string; actions: PermAction[] } | null}
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
    actions: normalizeActions(row.actions),
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
 *   actions: PermAction[];
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
    /** @type {Record<string, unknown>} */
    const row = { ...meta, ...flags };
    for (const flag of PERM_FLAGS) {
      if (!rowAllowsFlag(row, flag)) {
        row[flag] = false;
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function cloneMatrixRows(rows) {
  return rows.map((r) => ({ ...r, actions: Array.isArray(r.actions) ? [...r.actions] : r.actions }));
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
 * Apply a flag change. Enabling any action other than view also enables view,
 * since a page cannot be reached without it. Disabling view never touches the
 * other actions.
 *
 * @param {Record<string, unknown>} row
 * @param {PermFlag} flag
 * @param {boolean} checked
 */
export function applyFlagToRow(row, flag, checked) {
  if (!rowAllowsFlag(row, flag)) return row;

  const next = { ...row };
  next[flag] = checked;
  if (checked && flag !== "can_view" && rowAllowsFlag(row, "can_view")) {
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
 * Set every applicable action on a row on or off.
 *
 * @param {Record<string, unknown>} row
 * @param {boolean} checked
 */
export function applyAllFlagsToRow(row, checked) {
  const next = { ...row };
  for (const flag of PERM_FLAGS) {
    if (rowAllowsFlag(row, flag)) {
      next[flag] = checked;
    }
  }
  return next;
}

/**
 * Checkbox state for “all actions on this row”.
 *
 * @param {Record<string, unknown>} row
 */
export function rowAllCheckState(row) {
  let applicable = 0;
  let on = 0;
  for (const flag of PERM_FLAGS) {
    if (!rowAllowsFlag(row, flag)) continue;
    applicable += 1;
    if (row[flag]) on += 1;
  }
  if (!applicable) {
    return { checked: false, indeterminate: false, applicableCount: 0 };
  }
  return {
    checked: on === applicable,
    indeterminate: on > 0 && on < applicable,
    applicableCount: applicable,
  };
}

/**
 * Header checkbox state for the All column across visible rows.
 *
 * @param {Array<Record<string, unknown>>} rows
 */
export function allRowsCheckState(rows) {
  if (!rows.length) {
    return { checked: false, indeterminate: false, applicableCount: 0 };
  }
  let applicableCount = 0;
  let full = 0;
  let any = 0;
  for (const row of rows) {
    const state = rowAllCheckState(row);
    if (state.applicableCount === 0) continue;
    applicableCount += 1;
    if (state.checked) full += 1;
    if (state.checked || state.indeterminate) any += 1;
  }
  if (!applicableCount) {
    return { checked: false, indeterminate: false, applicableCount: 0 };
  }
  return {
    checked: full === applicableCount,
    indeterminate: any > 0 && full < applicableCount,
    applicableCount,
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {PermFlag} flag
 */
export function columnCheckState(rows, flag) {
  const applicable = rows.filter((row) => rowAllowsFlag(row, flag));
  if (!applicable.length) {
    return { checked: false, indeterminate: false, applicableCount: 0 };
  }
  let on = 0;
  for (const row of applicable) {
    if (row[flag]) on += 1;
  }
  return {
    checked: on === applicable.length,
    indeterminate: on > 0 && on < applicable.length,
    applicableCount: applicable.length,
  };
}

/**
 * Payload for PUT roles/{id}/permissions
 * @param {Array<Record<string, unknown>>} rows
 */
export function matrixRowsToPayload(rows) {
  return rows.map((row) => ({
    permission_id: Number(row.permission_id),
    can_view: rowAllowsFlag(row, "can_view") && Boolean(row.can_view),
    can_add: rowAllowsFlag(row, "can_add") && Boolean(row.can_add),
    can_edit: rowAllowsFlag(row, "can_edit") && Boolean(row.can_edit),
    can_delete: rowAllowsFlag(row, "can_delete") && Boolean(row.can_delete),
    can_import: rowAllowsFlag(row, "can_import") && Boolean(row.can_import),
    can_export: rowAllowsFlag(row, "can_export") && Boolean(row.can_export),
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
