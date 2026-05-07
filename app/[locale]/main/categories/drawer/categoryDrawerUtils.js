/*
 * Plain helper functions and small constants for the category drawer (no React).
 * Payloads, dirty checks, sort order, and create-save intent storage keys (listeners live in @/lib/drawer/persistedSaveIntent).
 */

import { normalizeHexColor } from "@/lib/drawer/normalizeHexColor";

/** @typedef {"keep" | "new" | "close"} CategoryCreateSaveIntent */

export const CATEGORY_CREATE_SAVE_INTENT_KEY = "categoryDrawer:createSaveIntent";
export const CATEGORY_CREATE_SAVE_INTENT_EVENT = "categoryDrawer:createSaveIntent:change";

export const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
export const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

/**
 * @param {import("antd").FormInstance} form
 * @param {{ code: string; name: string; color: string; description: string; is_active: boolean }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const code = String(v.code ?? "").trim();
  const name = String(v.name ?? "").trim();
  const description = String(v.description ?? "").trim();
  const color = normalizeHexColor(typeof v.color === "string" ? v.color : String(v.color ?? ""));
  const isActive = v.is_active !== false;

  if (code !== String(defaults.code ?? "").trim()) return true;
  if (name !== String(defaults.name ?? "").trim()) return true;
  if (description !== String(defaults.description ?? "").trim()) return true;
  if (color !== normalizeHexColor(String(defaults.color ?? ""))) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const code = String(v.code ?? "").trim();
  const name = String(v.name ?? "").trim();
  const description = String(v.description ?? "").trim();
  const color = normalizeHexColor(typeof v.color === "string" ? v.color : String(v.color ?? ""));
  const isActive = v.is_active !== false;

  if (code !== String(row.code ?? "").trim()) return true;
  if (name !== String(row.name ?? "").trim()) return true;
  const rowDesc = row.description == null ? "" : String(row.description).trim();
  if (description !== rowDesc) return true;
  if (color !== normalizeHexColor(String(row.color ?? ""))) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  return false;
}

/**
 * @param {string} code
 * @param {string} name
 * @param {string} color
 */
export function requiredFieldsValid(code, name, color) {
  const c = String(code ?? "")
    .trim()
    .toUpperCase();
  const n = String(name ?? "").trim();
  const col = typeof color === "string" ? color : String(color ?? "");
  if (!c || !n || !col) return false;
  if (!CODE_PATTERN.test(c)) return false;
  if (!COLOR_PATTERN.test(col)) return false;
  return true;
}

/** @param {Record<string, unknown>} row */
export function toCategoryCacheRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    color: row.color,
    description: row.description ?? null,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortCategoriesByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function categoryFormValuesToPayload(values) {
  return {
    code: String(values.code ?? "").trim().toUpperCase(),
    name: String(values.name ?? "").trim(),
    color: typeof values.color === "string" ? values.color : String(values.color ?? ""),
    description: (() => {
      const d = values.description;
      if (d == null || typeof d !== "string") return null;
      const trimmed = d.trim();
      return trimmed === "" ? null : trimmed;
    })(),
    is_active: Boolean(values.is_active),
  };
}
