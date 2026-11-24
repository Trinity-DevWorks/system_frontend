/*
 * Plain helper functions and small constants for the central plan drawer (no React).
 */

export const CENTRAL_PLAN_CREATE_SAVE_INTENT_KEY = "centralPlanDrawer:createSaveIntent";
export const CENTRAL_PLAN_CREATE_SAVE_INTENT_EVENT = "centralPlanDrawer:createSaveIntent:change";

/** Limit fields, `null` = unlimited (backend `Plan::LIMITS`). */
export const PLAN_LIMIT_FIELDS = Object.freeze(["max_users", "max_branches", "max_warehouses", "max_storage_mb"]);

export const BILLING_CYCLES = Object.freeze(["monthly", "yearly"]);

export const CENTRAL_PLAN_DEFAULTS = Object.freeze({
  name: "",
  description: "",
  price: 0,
  currency: "USD",
  billing_cycle: "monthly",
  max_users: null,
  max_branches: null,
  max_warehouses: null,
  max_storage_mb: null,
  modules: ["core"],
  is_active: true,
  sort_order: 0,
});

/** @param {string} name */
export function requiredFieldsValid(name) {
  return String(name ?? "").trim().length > 0;
}

/** @param {unknown} value */
function limitOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** @param {unknown} codes */
function sortedModules(codes) {
  const list = Array.isArray(codes) ? codes.map(String) : [];
  return [...new Set([...list, "core"])].sort();
}

/** @param {Record<string, unknown>} values */
export function planFormValuesToPayload(values) {
  const description =
    typeof values.description === "string" && values.description.trim() !== "" ? values.description.trim() : null;

  return {
    name: String(values.name ?? "").trim(),
    description,
    price: Number(values.price ?? 0),
    currency: String(values.currency ?? "").trim().toUpperCase(),
    billing_cycle: String(values.billing_cycle ?? "monthly"),
    max_users: limitOrNull(values.max_users),
    max_branches: limitOrNull(values.max_branches),
    max_warehouses: limitOrNull(values.max_warehouses),
    max_storage_mb: limitOrNull(values.max_storage_mb),
    modules: sortedModules(values.modules),
    is_active: Boolean(values.is_active),
    sort_order: Number(values.sort_order ?? 0) || 0,
  };
}

/** @param {Record<string, unknown>} record */
export function planRecordToFormValues(record) {
  return {
    name: record.name ?? "",
    description: record.description ?? "",
    price: Number(record.price ?? 0),
    currency: record.currency ?? "USD",
    billing_cycle: record.billing_cycle ?? "monthly",
    max_users: record.max_users ?? null,
    max_branches: record.max_branches ?? null,
    max_warehouses: record.max_warehouses ?? null,
    max_storage_mb: record.max_storage_mb ?? null,
    modules: sortedModules(record.modules),
    is_active: record.is_active !== false,
    sort_order: Number(record.sort_order ?? 0),
  };
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} baseline record or defaults
 */
export function isPlanFormDirty(form, baseline) {
  const current = planFormValuesToPayload(form.getFieldsValue(true));
  const base = planFormValuesToPayload(planRecordToFormValues(baseline));
  return JSON.stringify(current) !== JSON.stringify(base);
}

/** @param {Record<string, unknown>} row */
export function toCentralPlanCacheRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    price: row.price,
    currency: row.currency,
    billing_cycle: row.billing_cycle,
    max_users: row.max_users ?? null,
    max_branches: row.max_branches ?? null,
    max_warehouses: row.max_warehouses ?? null,
    max_storage_mb: row.max_storage_mb ?? null,
    modules: Array.isArray(row.modules) ? row.modules : null,
    is_active: row.is_active,
    sort_order: row.sort_order ?? 0,
    tenants_count: row.tenants_count ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Same order as the backend: sort_order, then name. @param {unknown[]} list */
export function sortPlans(list) {
  return [...list].sort((a, b) => {
    const pa = /** @type {{ sort_order?: number, name?: string }} */ (a);
    const pb = /** @type {{ sort_order?: number, name?: string }} */ (b);
    const bySort = Number(pa.sort_order ?? 0) - Number(pb.sort_order ?? 0);
    if (bySort !== 0) return bySort;
    return String(pa.name ?? "").localeCompare(String(pb.name ?? ""), undefined, { sensitivity: "base" });
  });
}
