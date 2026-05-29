/*
 * Salesman drawer helpers (no React).
 */

import dayjs from "dayjs";

export const SALESMAN_COMMISSION_TYPES = ["none", "percent", "fixed"];

/** Select option value; not a real warehouse id — opens nested create warehouse drawer. */
export const SALESMAN_WAREHOUSE_ADD_NEW_VALUE = "__salesman_drawer_add_warehouse__";

export const SALESMAN_CREATE_SAVE_INTENT_KEY = "salesmanDrawer:createSaveIntent";
export const SALESMAN_CREATE_SAVE_INTENT_EVENT = "salesmanDrawer:createSaveIntent:change";

/**
 * @param {string} firstName
 * @param {string} lastName
 */
export function requiredFieldsValid(firstName, lastName) {
  return Boolean(String(firstName ?? "").trim() && String(lastName ?? "").trim());
}

/**
 * @param {string} commissionType
 * @param {unknown} commissionValue
 */
export function commissionValueValid(commissionType, commissionValue) {
  const ct = String(commissionType ?? "none");
  if (ct === "none") return true;
  const n = Number(commissionValue);
  if (!Number.isFinite(n) || n < 0) return false;
  if (ct === "percent" && n > 100) return false;
  return true;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  if (normalizeHireDate(v.hire_date) !== normalizeHireDate(defaults.hire_date)) return true;
  if (Boolean(v.is_active) !== Boolean(defaults.is_active)) return true;
  const keys = [
    "salesman_code",
    "first_name",
    "last_name",
    "phone",
    "email",
    "address",
    "commission_type",
    "commission_value",
    "target_amount",
    "warehouse_id",
    "user_id",
    "notes",
  ];
  for (const k of keys) {
    if (k === "commission_value" || k === "target_amount") {
      if (!sameOptionalNumber(v[k], defaults[k])) return true;
      continue;
    }
    if (k === "warehouse_id" || k === "user_id") {
      if (!sameOptionalId(v[k], defaults[k])) return true;
      continue;
    }
    if (normalizeScalar(v[k]) !== normalizeScalar(defaults[k])) return true;
  }
  return false;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  if (normalizeHireDate(v.hire_date) !== normalizeHireDate(row.hire_date)) return true;
  if (Boolean(v.is_active) !== Boolean(row.is_active)) return true;
  const keys = [
    "salesman_code",
    "first_name",
    "last_name",
    "phone",
    "email",
    "address",
    "commission_type",
    "commission_value",
    "target_amount",
    "warehouse_id",
    "user_id",
    "notes",
  ];
  for (const k of keys) {
    if (k === "commission_value" || k === "target_amount") {
      if (!sameOptionalNumber(v[k], row[k])) return true;
      continue;
    }
    if (k === "warehouse_id" || k === "user_id") {
      if (!sameOptionalId(v[k], row[k])) return true;
      continue;
    }
    if (normalizeScalar(v[k]) !== normalizeScalar(row[k])) return true;
  }
  return false;
}

/** @param {unknown} a @param {unknown} b */
function sameOptionalNumber(a, b) {
  const na = toOptionalNumber(a);
  const nb = toOptionalNumber(b);
  if (na == null && nb == null) return true;
  if (na == null || nb == null) return false;
  return Math.abs(na - nb) < 1e-8;
}

/** @param {unknown} a @param {unknown} b */
function sameOptionalId(a, b) {
  return toOptionalId(a) === toOptionalId(b);
}

/** @param {unknown} a */
function toOptionalNumber(a) {
  if (a == null || a === "") return null;
  const n = Number(a);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} a */
function toOptionalId(a) {
  if (a == null || a === "") return null;
  const n = Number(a);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} val */
function normalizeHireDate(val) {
  if (val == null || val === "") return "";
  if (dayjs.isDayjs(val)) return val.format("YYYY-MM-DD");
  return String(val).trim().slice(0, 10);
}

/** @param {unknown} val */
function normalizeScalar(val) {
  if (val == null || val === "") return "";
  if (typeof val === "number") return String(val);
  return String(val).trim();
}

/** @param {Record<string, unknown>} row */
export function toSalesmanCacheRow(row) {
  return {
    id: row.id,
    salesman_code: row.salesman_code,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    commission_type: row.commission_type,
    commission_value: row.commission_value,
    target_amount: row.target_amount,
    hire_date: row.hire_date,
    warehouse_id: row.warehouse_id,
    warehouse_name: row.warehouse_name,
    user_id: row.user_id,
    user_name: row.user_name,
    is_active: Boolean(row.is_active),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortSalesmenByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ full_name?: string }} */ (a).full_name ?? "").localeCompare(
      String(/** @type {{ full_name?: string }} */ (b).full_name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/** @param {Record<string, unknown>} values */
export function salesmanFormValuesToPayload(values) {
  const ct = String(values.commission_type ?? "none");
  const code = String(values.salesman_code ?? "").trim();
  const hire = values.hire_date;
  let hireDate = null;
  if (hire != null) {
    if (dayjs.isDayjs(hire)) {
      hireDate = hire.format("YYYY-MM-DD");
    } else if (typeof hire === "string" && hire.trim()) {
      hireDate = dayjs(hire).format("YYYY-MM-DD");
    }
  }

  const commissionValue =
    ct === "none" ? null : values.commission_value == null || values.commission_value === "" ? null : Number(values.commission_value);

  const target =
    values.target_amount == null || values.target_amount === "" ? null : String(Number(values.target_amount));

  const w = values.warehouse_id;
  const u = values.user_id;

  const emptyToNull = (s) => {
    const x = String(s ?? "").trim();
    return x === "" ? null : x;
  };

  return {
    salesman_code: code === "" ? null : code,
    first_name: String(values.first_name ?? "").trim(),
    last_name: String(values.last_name ?? "").trim(),
    phone: emptyToNull(values.phone),
    email: emptyToNull(values.email),
    address: emptyToNull(values.address),
    commission_type: ct,
    commission_value: commissionValue == null ? null : String(commissionValue),
    target_amount: target,
    hire_date: hireDate,
    warehouse_id: w == null || w === "" ? null : Number(w),
    user_id: u == null || u === "" ? null : Number(u),
    is_active: Boolean(values.is_active),
    notes: emptyToNull(values.notes),
  };
}
