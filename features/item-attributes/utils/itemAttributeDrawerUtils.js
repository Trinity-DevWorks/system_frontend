export const ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_KEY = "itemAttributeDrawer:createSaveIntent";
export const ITEM_ATTRIBUTE_CREATE_SAVE_INTENT_EVENT = "itemAttributeDrawer:createSaveIntent:change";

/** Same rule as the backend: letters, digits, underscore. */
export const ATTRIBUTE_CODE_PATTERN = /^[A-Za-z0-9_]+$/;

export const ITEM_ATTRIBUTE_DEFAULTS = Object.freeze({
  code: "",
  name: "",
  sort_order: 0,
  values: [{ code: "", name: "" }],
});

/** @param {unknown} v */
const text = (v) => String(v ?? "").trim();

/**
 * Canonical shape used for the API payload and for dirty checks.
 * @param {Record<string, any>} values
 */
export function itemAttributeFormValuesToPayload(values) {
  const rows = Array.isArray(values?.values) ? values.values : [];
  return {
    code: text(values?.code).toUpperCase(),
    name: text(values?.name),
    sort_order: Number(values?.sort_order ?? 0) || 0,
    values: rows
      .filter((row) => row && (text(row.code) || text(row.name)))
      .map((row, index) => ({
        ...(row.id != null ? { id: Number(row.id) } : {}),
        code: text(row.code).toUpperCase(),
        name: text(row.name),
        sort_order: index,
      })),
  };
}

/** @param {Record<string, any>} record */
export function mapItemAttributeToFormValues(record) {
  const values = Array.isArray(record?.values) ? record.values : [];
  return {
    code: record?.code ?? "",
    name: record?.name ?? "",
    sort_order: Number(record?.sort_order ?? 0),
    values: values.map((v) => ({ id: v.id, code: v.code ?? "", name: v.name ?? "" })),
  };
}

/** @param {Record<string, any>} row */
export function toItemAttributeCacheRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sort_order: row.sort_order ?? 0,
    values: Array.isArray(row.values) ? row.values : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, any>} baseline form-shaped values or a loaded record
 */
export function isItemAttributeDirty(form, baseline) {
  const current = itemAttributeFormValuesToPayload(form.getFieldsValue(true));
  const base = itemAttributeFormValuesToPayload(
    "id" in (baseline ?? {}) ? mapItemAttributeToFormValues(baseline) : baseline,
  );
  return JSON.stringify(current) !== JSON.stringify(base);
}

/**
 * @param {unknown} code
 * @param {unknown} name
 */
export function requiredFieldsValid(code, name) {
  const c = text(code);
  return Boolean(c && text(name) && c.length <= 32 && ATTRIBUTE_CODE_PATTERN.test(c));
}
