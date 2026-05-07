/*
 * Plain helper functions and small constants for the sub-category drawer (no React).
 * Payloads, dirty checks, sort order, and create-save intent storage keys (listeners live in @/lib/drawer/persistedSaveIntent).
 */

import { normalizeHexColor } from "@/lib/drawer/normalizeHexColor";

/** @typedef {"keep" | "new" | "close"} SubCategoryCreateSaveIntent */

export const SUB_CATEGORY_CREATE_SAVE_INTENT_KEY = "subCategoryDrawer:createSaveIntent";
export const SUB_CATEGORY_CREATE_SAVE_INTENT_EVENT = "subCategoryDrawer:createSaveIntent:change";

export const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

/**
 * @param {import("antd").FormInstance} form
 * @param {{ category_id?: number; name: string; color: string }} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const cid = v.category_id;
  const name = String(v.name ?? "").trim();
  const color = normalizeHexColor(typeof v.color === "string" ? v.color : String(v.color ?? ""));
  const defCid = defaults.category_id;

  if (cid !== defCid && !(cid == null && defCid == null)) return true;
  if (name !== String(defaults.name ?? "").trim()) return true;
  if (color !== normalizeHexColor(String(defaults.color ?? ""))) return true;
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  const cid = Number(v.category_id);
  const name = String(v.name ?? "").trim();
  const color = normalizeHexColor(typeof v.color === "string" ? v.color : String(v.color ?? ""));

  if (cid !== Number(row.category_id)) return true;
  if (name !== String(row.name ?? "").trim()) return true;
  if (color !== normalizeHexColor(String(row.color ?? ""))) return true;
  return false;
}

/**
 * @param {number | undefined} categoryId
 * @param {string} name
 * @param {string} color
 */
export function requiredFieldsValid(categoryId, name, color) {
  if (categoryId == null || !Number.isFinite(Number(categoryId))) return false;
  const n = String(name ?? "").trim();
  const col = typeof color === "string" ? color : String(color ?? "");
  if (!n || !col) return false;
  if (!COLOR_PATTERN.test(col)) return false;
  return true;
}

/** @param {Record<string, unknown>} row */
export function toSubCategoryCacheRow(row) {
  return {
    id: row.id,
    category_id: row.category_id,
    category: row.category && typeof row.category === "object" ? row.category : null,
    name: row.name,
    color: row.color,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortSubCategoriesByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function subCategoryFormValuesToPayload(values) {
  return {
    category_id: Number(values.category_id),
    name: String(values.name ?? "").trim(),
    color: typeof values.color === "string" ? values.color : String(values.color ?? ""),
  };
}
