/*
 * Plain helper functions and small constants for the branch drawer (no React).
 * Payload mapping, dirty checks, sort order, and create-save intent storage keys.
 */

import dayjs from "dayjs";

/** @typedef {"keep" | "new" | "close"} BranchCreateSaveIntent */

export const BRANCH_CREATE_SAVE_INTENT_KEY = "branchDrawer:createSaveIntent";
export const BRANCH_CREATE_SAVE_INTENT_EVENT = "branchDrawer:createSaveIntent:change";

const SHORTCUT_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/** @param {unknown} value */
function asTrimmed(value) {
  return String(value ?? "").trim();
}

/** @param {unknown} value */
function asTimeString(value) {
  if (value == null || value === "") return "";
  if (dayjs.isDayjs(value)) return value.format("HH:mm");
  const s = String(value).trim();
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  if (asTrimmed(v.name) !== asTrimmed(defaults.name)) return true;
  if (asTrimmed(v.shortcut_name).toUpperCase() !== asTrimmed(defaults.shortcut_name).toUpperCase()) return true;
  if (asTrimmed(v.address) !== asTrimmed(defaults.address)) return true;
  if (asTrimmed(v.phone) !== asTrimmed(defaults.phone)) return true;
  if (asTrimmed(v.email) !== asTrimmed(defaults.email)) return true;
  if (asTrimmed(v.timezone) !== asTrimmed(defaults.timezone)) return true;
  if (asTimeString(v.opening_time) !== asTimeString(defaults.opening_time)) return true;
  if (asTimeString(v.closing_time) !== asTimeString(defaults.closing_time)) return true;
  if (String(v.manager_id ?? "") !== String(defaults.manager_id ?? "")) return true;
  if ((v.is_active !== false) !== Boolean(defaults.is_active)) return true;
  if (Boolean(v.is_default) !== Boolean(defaults.is_default)) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  if (asTrimmed(v.name) !== asTrimmed(row.name)) return true;
  if (asTrimmed(v.shortcut_name).toUpperCase() !== asTrimmed(row.shortcut_name).toUpperCase()) return true;
  if (asTrimmed(v.address) !== asTrimmed(row.address)) return true;
  if (asTrimmed(v.phone) !== asTrimmed(row.phone)) return true;
  if (asTrimmed(v.email) !== asTrimmed(row.email)) return true;
  if (asTrimmed(v.timezone) !== asTrimmed(row.timezone)) return true;
  if (asTimeString(v.opening_time) !== asTimeString(row.opening_time)) return true;
  if (asTimeString(v.closing_time) !== asTimeString(row.closing_time)) return true;
  if (String(v.manager_id ?? "") !== String(row.manager_id ?? "")) return true;
  if ((v.is_active !== false) !== Boolean(row.is_active)) return true;
  if (Boolean(v.is_default) !== Boolean(row.is_default)) return true;
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
    email: row.email ?? null,
    timezone: row.timezone ?? null,
    opening_time: row.opening_time ?? null,
    closing_time: row.closing_time ?? null,
    manager_id: row.manager_id ?? null,
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

/** @param {unknown} value */
function timeToPayload(value) {
  const s = asTimeString(value);
  return s === "" ? null : s;
}

/** @param {Record<string, unknown>} values */
export function branchFormValuesToPayload(values) {
  const trimOrNull = (value) => {
    const s = String(value ?? "").trim();
    return s === "" ? null : s;
  };

  const managerId = values.manager_id;
  return {
    name: String(values.name ?? "").trim(),
    shortcut_name: String(values.shortcut_name ?? "").trim().toUpperCase(),
    address: trimOrNull(values.address),
    phone: trimOrNull(values.phone),
    email: trimOrNull(values.email),
    timezone: trimOrNull(values.timezone),
    opening_time: timeToPayload(values.opening_time),
    closing_time: timeToPayload(values.closing_time),
    manager_id: managerId == null || managerId === "" ? null : String(managerId),
    is_active: Boolean(values.is_active),
    is_default: Boolean(values.is_default),
  };
}

/** @param {unknown} value */
export function parseTimeToDayjs(value) {
  const s = asTimeString(value);
  if (!s) return undefined;
  const parsed = dayjs(s, "HH:mm", true);
  return parsed.isValid() ? parsed : undefined;
}
