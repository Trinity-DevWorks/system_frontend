/*
 * Plain helper functions and small constants for the supplier drawer (no React).
 */

/** @typedef {"keep" | "new" | "close"} SupplierCreateSaveIntent */

export const SUPPLIER_CREATE_SAVE_INTENT_KEY = "supplierDrawer:createSaveIntent";
export const SUPPLIER_CREATE_SAVE_INTENT_EVENT = "supplierDrawer:createSaveIntent:change";

function normGroupId(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const name = String(v.name ?? "").trim();
  const email = String(v.email ?? "").trim();
  const phone = String(v.phone ?? "").trim();
  const groupId = v.supplier_group_id;
  const credit = v.credit_limit;
  const opening = v.opening_balance;
  const isActive = v.is_active !== false;
  const isVat = v.is_vat_registered === true;
  const vat = String(v.vat_number ?? "").trim();
  const notes = String(v.notes ?? "").trim();

  if (name !== String(defaults.name ?? "").trim()) return true;
  if (email !== String(defaults.email ?? "").trim()) return true;
  if (phone !== String(defaults.phone ?? "").trim()) return true;
  if (groupId !== defaults.supplier_group_id && !(groupId == null && defaults.supplier_group_id == null)) return true;
  if (Number(credit ?? 0) !== Number(defaults.credit_limit ?? 0)) return true;
  if (Number(opening ?? 0) !== Number(defaults.opening_balance ?? 0)) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  if (isVat !== Boolean(defaults.is_vat_registered)) return true;
  if (vat !== String(defaults.vat_number ?? "").trim()) return true;
  if (notes !== String(defaults.notes ?? "").trim()) return true;
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
  const phone = String(v.phone ?? "").trim();
  const groupId = v.supplier_group_id;
  const credit = Number(v.credit_limit ?? 0);
  const isActive = v.is_active !== false;
  const isVat = v.is_vat_registered === true;
  const vat = String(v.vat_number ?? "").trim();
  const notes = String(v.notes ?? "").trim();

  if (name !== String(row.name ?? "").trim()) return true;
  if (email !== String(row.email ?? "").trim()) return true;
  if (phone !== String(row.phone ?? "").trim()) return true;
  if (normGroupId(groupId) !== normGroupId(row.supplier_group_id)) return true;
  if (credit !== Number(row.credit_limit ?? 0)) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  if (isVat !== Boolean(row.is_vat_registered)) return true;
  if (vat !== String(row.vat_number ?? "").trim()) return true;
  if (notes !== String(row.notes ?? "").trim()) return true;
  return false;
}

/** @param {string} name */
export function requiredFieldsValid(name) {
  return Boolean(String(name ?? "").trim());
}

/** @param {Record<string, unknown>} row */
export function toSupplierCacheRow(row) {
  return {
    id: row.id,
    supplier_code: row.supplier_code,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    supplier_group_id: row.supplier_group_id,
    supplier_group: row.supplier_group && typeof row.supplier_group === "object" ? row.supplier_group : null,
    credit_limit: row.credit_limit,
    opening_balance: row.opening_balance,
    balance: row.balance,
    is_active: Boolean(row.is_active),
    is_vat_registered: Boolean(row.is_vat_registered),
    vat_number: row.vat_number ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortSuppliersByName(list) {
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
export function supplierFormValuesToPayload(values, mode) {
  const name = String(values.name ?? "").trim();
  const emailRaw = String(values.email ?? "").trim();
  const phoneRaw = String(values.phone ?? "").trim();
  const vatNumRaw = String(values.vat_number ?? "").trim();
  const notesRaw = String(values.notes ?? "").trim();
  const isVat = values.is_vat_registered === true;

  /** @type {Record<string, unknown>} */
  const base = {
    name,
    email: emailRaw === "" ? null : emailRaw,
    phone: phoneRaw === "" ? null : phoneRaw,
    supplier_group_id:
      values.supplier_group_id == null || values.supplier_group_id === "" ? null : Number(values.supplier_group_id),
    credit_limit: values.credit_limit == null || values.credit_limit === "" ? 0 : Number(values.credit_limit),
    is_active: values.is_active !== false,
    is_vat_registered: isVat,
    vat_number: isVat ? (vatNumRaw === "" ? null : vatNumRaw.slice(0, 128)) : null,
    notes: notesRaw === "" ? null : notesRaw,
  };

  if (mode === "create") {
    const ob = values.opening_balance;
    const openingStr = ob == null || ob === "" ? "0" : String(Number(ob));
    return { ...base, opening_balance: openingStr };
  }

  return base;
}
