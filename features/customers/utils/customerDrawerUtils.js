/*
 * Plain helper functions and small constants for the customer drawer (no React).
 */

import dayjs from "dayjs";
import { tenantMoneyFixed } from "@/lib/tenant-format";

/** @typedef {"keep" | "new" | "close"} CustomerCreateSaveIntent */

export const CUSTOMER_CREATE_SAVE_INTENT_KEY = "customerDrawer:createSaveIntent";
export const CUSTOMER_CREATE_SAVE_INTENT_EVENT = "customerDrawer:createSaveIntent:change";

/** Select sentinels for nested create drawers (not real relation ids). */
export const CUSTOMER_LOOKUP_ADD_CUSTOMER_GROUP = "__customer_drawer_add_customer_group__";
export const CUSTOMER_LOOKUP_ADD_SALESMAN = "__customer_drawer_add_salesman__";
export const CUSTOMER_LOOKUP_ADD_PAYMENT_METHOD = "__customer_drawer_add_payment_method__";
export const CUSTOMER_LOOKUP_ADD_PAYMENT_TERMS = "__customer_drawer_add_payment_terms__";
export const CUSTOMER_LOOKUP_ADD_VAT_GROUP = "__customer_drawer_add_vat_group__";

/** @typedef {"customer-group" | "salesman" | "payment-method" | "payment-terms" | "vat-group"} CustomerNestedCreateKey */

/** @param {unknown} value */
export function optionalRelationId(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Merge credit-limit rows and opening-balance rows into one row per currency (for fingerprint / API prep).
 * Same currency may appear once in each list; they are combined by currency_id.
 * @param {unknown[]} creditRows
 * @param {unknown[]} openingRows
 * @returns {Array<Record<string, unknown>>}
 */
export function mergeCreditAndOpeningRows(creditRows, openingRows) {
  const credits = Array.isArray(creditRows) ? creditRows : [];
  const openings = Array.isArray(openingRows) ? openingRows : [];
  /** @type {Map<number, { currency_id: number, credit_limit: number, opening_balance: number, opening_date?: unknown }>} */
  const map = new Map();

  for (const raw of credits) {
    if (!raw || typeof raw !== "object") continue;
    const r = /** @type {Record<string, unknown>} */ (raw);
    if (r.currency_id == null || r.currency_id === "") continue;
    const id = Number(r.currency_id);
    if (!Number.isFinite(id)) continue;
    const credit = r.credit_limit == null || r.credit_limit === "" ? 0 : Number(r.credit_limit);
    map.set(id, {
      currency_id: id,
      credit_limit: Number.isFinite(credit) ? credit : 0,
      opening_balance: 0,
    });
  }

  for (const raw of openings) {
    if (!raw || typeof raw !== "object") continue;
    const r = /** @type {Record<string, unknown>} */ (raw);
    if (r.currency_id == null || r.currency_id === "") continue;
    const id = Number(r.currency_id);
    if (!Number.isFinite(id)) continue;
    const opening = r.opening_balance == null || r.opening_balance === "" ? 0 : Number(r.opening_balance);
    const existing = map.get(id) ?? { currency_id: id, credit_limit: 0, opening_balance: 0 };
    existing.opening_balance = Number.isFinite(opening) ? opening : 0;
    const od = r.opening_date;
    if (od != null && od !== "") {
      const parsed = dayjs(od);
      existing.opening_date = parsed.isValid() ? parsed : od;
    } else if (existing.opening_balance !== 0) {
      existing.opening_date = dayjs();
    }
    map.set(id, existing);
  }

  return [...map.values()]
    .filter((m) => m.credit_limit !== 0 || m.opening_balance !== 0)
    .map((m) => {
      /** @type {Record<string, unknown>} */
      const row = {
        currency_id: m.currency_id,
        credit_limit: m.credit_limit,
        opening_balance: m.opening_balance,
      };
      if (m.opening_date != null && m.opening_date !== "") {
        row.opening_date = m.opening_date;
      }
      return row;
    });
}

/**
 * @param {unknown[]} rows merged rows (same shape as legacy single-list rows)
 */
export function currencyBalancesFingerprint(rows) {
  if (!Array.isArray(rows)) return "";
  return [...rows]
    .filter((r) => r && r.currency_id != null && r.currency_id !== "")
    .map((r) => {
      const id = Number(r.currency_id);
      const c = Number(r.credit_limit ?? 0);
      const o = Number(r.opening_balance ?? 0);
      const d = r.opening_date;
      let dateKey = "";
      if (d != null && d !== "") {
        const parsed = dayjs(d);
        dateKey = parsed.isValid() ? parsed.format("YYYY-MM-DD") : String(d).slice(0, 10);
      }
      return `${id}:${tenantMoneyFixed(c)}:${tenantMoneyFixed(o)}:${dateKey}`;
    })
    .sort()
    .join("|");
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
  const groupId = v.customer_group_id;
  const type = v.type;
  const status = String(v.status ?? "active");
  const blacklist = String(v.blacklist_reason ?? "").trim();
  const isVat = v.is_vat_registered === true;
  const vat = String(v.vat_number ?? "").trim();
  const notes = String(v.notes ?? "").trim();

  if (name !== String(defaults.name ?? "").trim()) return true;
  if (email !== String(defaults.email ?? "").trim()) return true;
  if (phone !== String(defaults.phone ?? "").trim()) return true;
  if (optionalRelationId(groupId) !== optionalRelationId(defaults.customer_group_id)) return true;
  if (optionalRelationId(v.salesman_id) !== optionalRelationId(defaults.salesman_id)) return true;
  if (optionalRelationId(v.payment_method_id) !== optionalRelationId(defaults.payment_method_id)) return true;
  if (optionalRelationId(v.payment_terms_id) !== optionalRelationId(defaults.payment_terms_id)) return true;
  if (optionalRelationId(v.vat_group_id) !== optionalRelationId(defaults.vat_group_id)) return true;
  if (type !== defaults.type) return true;
  if (status !== String(defaults.status ?? "active")) return true;
  if (blacklist !== String(defaults.blacklist_reason ?? "").trim()) return true;
  if (isVat !== Boolean(defaults.is_vat_registered)) return true;
  if (vat !== String(defaults.vat_number ?? "").trim()) return true;
  if (notes !== String(defaults.notes ?? "").trim()) return true;
  if (currencyBalancesFingerprint(
    mergeCreditAndOpeningRows(/** @type {unknown[]} */ (v.currency_credit_limits ?? []), /** @type {unknown[]} */ (v.currency_opening_balances ?? [])),
  ) !==
    currencyBalancesFingerprint(
      mergeCreditAndOpeningRows(
        /** @type {unknown[]} */ (defaults.currency_credit_limits ?? []),
        /** @type {unknown[]} */ (defaults.currency_opening_balances ?? []),
      ),
    )) {
    return true;
  }
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
  const groupId = v.customer_group_id;
  const type = v.type;
  const status = String(v.status ?? "active");
  const blacklist = String(v.blacklist_reason ?? "").trim();
  const isVat = v.is_vat_registered === true;
  const vat = String(v.vat_number ?? "").trim();
  const notes = String(v.notes ?? "").trim();

  if (name !== String(row.name ?? "").trim()) return true;
  if (email !== String(row.email ?? "").trim()) return true;
  if (phone !== String(row.phone ?? "").trim()) return true;
  if (optionalRelationId(groupId) !== optionalRelationId(row.customer_group_id)) return true;
  if (optionalRelationId(v.salesman_id) !== optionalRelationId(row.salesman_id)) return true;
  if (optionalRelationId(v.payment_method_id) !== optionalRelationId(row.payment_method_id)) return true;
  if (optionalRelationId(v.payment_terms_id) !== optionalRelationId(row.payment_terms_id)) return true;
  if (optionalRelationId(v.vat_group_id) !== optionalRelationId(row.vat_group_id)) return true;
  if (type !== row.type) return true;
  if (status !== String(row.status ?? "active")) return true;
  if (blacklist !== String(row.blacklist_reason ?? "").trim()) return true;
  if (isVat !== Boolean(row.is_vat_registered)) return true;
  if (vat !== String(row.vat_number ?? "").trim()) return true;
  if (notes !== String(row.notes ?? "").trim()) return true;
  if (
    currencyBalancesFingerprint(
      mergeCreditAndOpeningRows(/** @type {unknown[]} */ (v.currency_credit_limits ?? []), /** @type {unknown[]} */ (v.currency_opening_balances ?? [])),
    ) !== currencyBalancesFingerprint(/** @type {unknown[]} */ (row.currency_balances ?? []))
  ) {
    return true;
  }
  return false;
}

/**
 * @param {string} name
 * @param {string} type
 */
export function requiredFieldsValid(name, type) {
  if (!String(name ?? "").trim()) return false;
  if (type !== "individual" && type !== "business") return false;
  return true;
}

/** @param {Record<string, unknown>} row */
export function toCustomerCacheRow(row) {
  return {
    id: row.id,
    customer_code: row.customer_code,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    type: row.type,
    customer_group_id: row.customer_group_id,
    customer_group: row.customer_group && typeof row.customer_group === "object" ? row.customer_group : null,
    salesman_id: row.salesman_id ?? null,
    payment_method_id: row.payment_method_id ?? null,
    payment_terms_id: row.payment_terms_id ?? null,
    vat_group_id: row.vat_group_id ?? null,
    credit_limit: row.credit_limit,
    opening_balance: row.opening_balance,
    balance: row.balance,
    currency_balances: Array.isArray(row.currency_balances) ? row.currency_balances : [],
    status: typeof row.status === "string" ? row.status : "active",
    is_system: Boolean(row.is_system),
    blacklist_reason: row.blacklist_reason ?? null,
    is_vat_registered: Boolean(row.is_vat_registered),
    vat_number: row.vat_number ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortCustomersByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ name?: string }} */ (a).name ?? "").localeCompare(
      String(/** @type {{ name?: string }} */ (b).name ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/**
 * @param {Record<string, unknown>} row
 */
function mapMergedBalanceToPayload(row) {
  if (!row || typeof row !== "object") return null;
  const r = /** @type {Record<string, unknown>} */ (row);
  if (r.currency_id == null || r.currency_id === "") return null;
  const currencyId = Number(r.currency_id);
  if (!Number.isFinite(currencyId)) return null;
  const creditRaw = r.credit_limit;
  const openRaw = r.opening_balance;
  const credit = creditRaw == null || creditRaw === "" ? 0 : Number(creditRaw);
  const opening = openRaw == null || openRaw === "" ? 0 : Number(openRaw);
  /** @type {Record<string, unknown>} */
  const out = {
    currency_id: currencyId,
    credit_limit: Number.isFinite(credit) ? credit : 0,
    opening_balance: Number.isFinite(opening) ? opening : 0,
  };
  const od = r.opening_date;
  if (opening !== 0) {
    if (od != null && od !== "") {
      const parsed = dayjs(od);
      out.opening_date = parsed.isValid() ? parsed.format("YYYY-MM-DD") : String(od).slice(0, 10);
    } else {
      out.opening_date = dayjs().format("YYYY-MM-DD");
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>} values
 * @param {"create" | "edit"} mode
 */
export function customerFormValuesToPayload(values, mode) {
  const name = String(values.name ?? "").trim();
  const emailRaw = String(values.email ?? "").trim();
  const phoneRaw = String(values.phone ?? "").trim();
  const vatNumRaw = String(values.vat_number ?? "").trim();
  const notesRaw = String(values.notes ?? "").trim();
  const isVat = values.is_vat_registered === true;

  const merged = mergeCreditAndOpeningRows(
    /** @type {unknown[]} */ (values.currency_credit_limits ?? []),
    /** @type {unknown[]} */ (values.currency_opening_balances ?? []),
  );
  const currency_balances = merged.map((row) => mapMergedBalanceToPayload(/** @type {Record<string, unknown>} */ (row))).filter(Boolean);

  const rawStatus = String(values.status ?? "active").trim();
  const status = ["active", "suspended", "blacklisted"].includes(rawStatus) ? rawStatus : "active";
  const blacklistRaw = String(values.blacklist_reason ?? "").trim();
  const blacklist_reason = status === "blacklisted" ? (blacklistRaw === "" ? null : blacklistRaw) : null;

  /** @type {Record<string, unknown>} */
  const base = {
    name,
    email: emailRaw === "" ? null : emailRaw,
    phone: phoneRaw === "" ? null : phoneRaw,
    customer_group_id: optionalRelationId(values.customer_group_id),
    salesman_id: optionalRelationId(values.salesman_id),
    payment_method_id: optionalRelationId(values.payment_method_id),
    payment_terms_id: optionalRelationId(values.payment_terms_id),
    vat_group_id: optionalRelationId(values.vat_group_id),
    type: values.type,
    currency_balances,
    status,
    blacklist_reason,
    is_vat_registered: isVat,
    vat_number: isVat ? (vatNumRaw === "" ? null : vatNumRaw.slice(0, 128)) : null,
    notes: notesRaw === "" ? null : notesRaw,
  };

  if (mode === "create") {
    return base;
  }

  return base;
}

/**
 * @param {unknown[]} currencyBalances from API
 * @returns {{ currency_credit_limits: unknown[]; currency_opening_balances: unknown[] }}
 */
export function mapApiCurrencyBalancesToFormSplit(currencyBalances) {
  if (!Array.isArray(currencyBalances)) {
    return { currency_credit_limits: [], currency_opening_balances: [] };
  }
  /** @type {unknown[]} */
  const creditRows = [];
  /** @type {unknown[]} */
  const openingRows = [];
  for (const b of currencyBalances) {
    const row = /** @type {Record<string, unknown>} */ (b && typeof b === "object" ? b : {});
    if (row.currency_id == null || row.currency_id === "") continue;
    creditRows.push({ currency_id: row.currency_id, credit_limit: Number(row.credit_limit ?? 0) });
    const ob = Number(row.opening_balance ?? 0);
    if (ob !== 0) {
      openingRows.push({
        currency_id: row.currency_id,
        opening_balance: ob,
        opening_date: row.opening_date ? dayjs(String(row.opening_date)) : dayjs(),
        ledger_balance: Number(row.balance ?? 0),
      });
    }
  }
  return { currency_credit_limits: creditRows, currency_opening_balances: openingRows };
}

export function primarySnapshotForOptimistic(primaryFromApi, currencyBalancesPayload, currencies) {
  const curList = Array.isArray(currencies) ? currencies : [];
  const primaryId = curList.find((c) => c && c.is_primary)?.id;
  const list = Array.isArray(currencyBalancesPayload) ? currencyBalancesPayload : [];
  const primaryRow =
    primaryId != null ? list.find((b) => b && Number(b.currency_id) === Number(primaryId)) : list[0] ?? null;
  const creditStr = primaryRow ? tenantMoneyFixed(primaryRow.credit_limit ?? 0) : tenantMoneyFixed(primaryFromApi ?? 0);
  const openingStr = primaryRow ? tenantMoneyFixed(primaryRow.opening_balance ?? 0) : tenantMoneyFixed(primaryFromApi ?? 0);
  const openingNum = Number(openingStr);
  const balanceGuess = Number.isFinite(openingNum) ? tenantMoneyFixed(openingNum) : tenantMoneyFixed(0);
  return {
    credit_limit: creditStr,
    opening_balance: openingStr,
    balance: balanceGuess,
  };
}
