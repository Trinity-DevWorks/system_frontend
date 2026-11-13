/*
 * Plain helper functions and small constants for the price list drawer (no React).
 */

import dayjs from "dayjs";

/** @typedef {"keep" | "new" | "close"} PriceListCreateSaveIntent */

export const PRICE_LIST_CREATE_SAVE_INTENT_KEY = "priceListDrawer:createSaveIntent";
export const PRICE_LIST_CREATE_SAVE_INTENT_EVENT = "priceListDrawer:createSaveIntent:change";

const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/** @param {unknown} value */
function dateString(value) {
  if (!value) return null;
  const d = dayjs(/** @type {any} */ (value));
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
}

/** @param {unknown} value */
function decimalString(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? String(value) : null;
}

/**
 * Comparable snapshot of the form (used for dirty checks).
 *
 * @param {Record<string, unknown>} v
 */
function snapshot(v) {
  const items = Array.isArray(v.items) ? v.items : [];
  return JSON.stringify({
    code: String(v.code ?? "").trim().toUpperCase(),
    name: String(v.name ?? "").trim(),
    name_ar: String(v.name_ar ?? "").trim(),
    currency_id: v.currency_id == null ? null : Number(v.currency_id),
    valid_from: dateString(v.valid_from),
    valid_to: dateString(v.valid_to),
    is_default: v.is_default === true,
    is_active: v.is_active !== false,
    items: items.map((row) => {
      const r = /** @type {Record<string, unknown>} */ (row ?? {});
      return [
        r.item_id == null ? null : String(r.item_id),
        r.item_uom_id == null ? null : Number(r.item_uom_id),
        Number(r.min_quantity ?? 0),
        r.price === null || r.price === undefined || r.price === "" ? null : Number(r.price),
        String(r.reason ?? "").trim(),
      ];
    }),
  });
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  return snapshot(form.getFieldsValue(true)) !== snapshot(defaults);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  return snapshot(form.getFieldsValue(true)) !== snapshot(recordToFormValues(row));
}

/**
 * @param {string} code
 * @param {string} name
 * @param {unknown} [currencyId]
 */
export function requiredFieldsValid(code, name, currencyId) {
  const c = String(code ?? "").trim().toUpperCase();
  const n = String(name ?? "").trim();
  if (!c || !n || currencyId == null || currencyId === "") return false;
  return CODE_PATTERN.test(c);
}

/** @param {Record<string, unknown>} row */
export function toPriceListCacheRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    name_ar: row.name_ar ?? null,
    currency_id: row.currency_id ?? null,
    currency_code: row.currency_code ?? null,
    valid_from: row.valid_from ?? null,
    valid_to: row.valid_to ?? null,
    is_default: row.is_default === true,
    is_active: row.is_active !== false,
    items_count: row.items_count ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * API record -> form values (dates become dayjs, items keep item labels for the selector seed).
 *
 * @param {Record<string, unknown>} r
 */
export function recordToFormValues(r) {
  const items = Array.isArray(r.items) ? r.items : [];
  return {
    code: r.code,
    name: r.name,
    name_ar: r.name_ar ?? "",
    currency_id: r.currency_id ?? undefined,
    valid_from: r.valid_from ? dayjs(String(r.valid_from)) : null,
    valid_to: r.valid_to ? dayjs(String(r.valid_to)) : null,
    is_default: r.is_default === true,
    is_active: r.is_active !== false,
    items: items.map((row) => {
      const it = /** @type {Record<string, unknown>} */ (row);
      return {
        item_id: it.item_id,
        item_label: [it.item_code, it.item_name].filter(Boolean).join(" — "),
        item_uom_id: it.item_uom_id,
        min_quantity: it.min_quantity != null ? Number(it.min_quantity) : 0,
        price: it.price != null ? Number(it.price) : null,
        reason: "",
      };
    }),
  };
}

/** @param {unknown[]} list */
export function sortPriceListsByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function priceListFormValuesToPayload(values) {
  const items = Array.isArray(values.items) ? values.items : [];
  return {
    code: String(values.code ?? "").trim().toUpperCase(),
    name: String(values.name ?? "").trim(),
    name_ar: String(values.name_ar ?? "").trim() || null,
    currency_id: values.currency_id == null ? null : Number(values.currency_id),
    valid_from: dateString(values.valid_from),
    valid_to: dateString(values.valid_to),
    is_default: values.is_default === true,
    is_active: values.is_active !== false,
    items: items
      .map((row) => /** @type {Record<string, unknown>} */ (row ?? {}))
      .filter((row) => row.item_id && row.item_uom_id)
      .map((row) => ({
        item_id: String(row.item_id),
        item_uom_id: Number(row.item_uom_id),
        min_quantity: decimalString(row.min_quantity) ?? "0",
        price: decimalString(row.price) ?? "0",
        ...(String(row.reason ?? "").trim() ? { reason: String(row.reason).trim() } : {}),
      })),
  };
}
