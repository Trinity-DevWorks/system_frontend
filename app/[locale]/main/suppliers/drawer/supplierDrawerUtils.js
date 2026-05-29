/*
 * Plain helper functions and small constants for the supplier drawer (no React).
 */

import dayjs from "dayjs";

/** @typedef {"keep" | "new" | "close"} SupplierCreateSaveIntent */

export const SUPPLIER_CREATE_SAVE_INTENT_KEY = "supplierDrawer:createSaveIntent";
export const SUPPLIER_CREATE_SAVE_INTENT_EVENT = "supplierDrawer:createSaveIntent:change";

/** Select sentinels for nested create drawers (not real relation ids). */
export const SUPPLIER_LOOKUP_ADD_SUPPLIER_GROUP = "__supplier_drawer_add_supplier_group__";
export const SUPPLIER_LOOKUP_ADD_PAYMENT_METHOD = "__supplier_drawer_add_payment_method__";
export const SUPPLIER_LOOKUP_ADD_PAYMENT_TERMS = "__supplier_drawer_add_payment_terms__";
export const SUPPLIER_LOOKUP_ADD_VAT_GROUP = "__supplier_drawer_add_vat_group__";

/** @typedef {"supplier-group" | "payment-method" | "payment-terms" | "vat-group"} SupplierNestedCreateKey */

function optionalRelationId(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} value */
function dateFingerprint(value) {
  if (value == null || value === "") return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : String(value).slice(0, 10);
}

/**
 * Merge credit-limit rows and opening-balance rows into one row per currency (for fingerprint / API prep).
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

/** @param {unknown[]} rows */
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
      return `${id}:${c.toFixed(4)}:${o.toFixed(4)}:${dateKey}`;
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
  const company = String(v.company_name ?? "").trim();
  const email = String(v.email ?? "").trim();
  const phone = String(v.phone ?? "").trim();
  const isActive = v.is_active !== false;
  const isVat = v.is_vat_registered === true;
  const isExempt = v.is_exempted === true;
  const vat = String(v.vat_number ?? "").trim();
  const exemption = String(v.exemption_reason ?? "").trim();
  const notes = String(v.notes ?? "").trim();

  if (name !== String(defaults.name ?? "").trim()) return true;
  if (company !== String(defaults.company_name ?? "").trim()) return true;
  if (email !== String(defaults.email ?? "").trim()) return true;
  if (phone !== String(defaults.phone ?? "").trim()) return true;
  if (optionalRelationId(v.supplier_group_id) !== optionalRelationId(defaults.supplier_group_id)) return true;
  if (optionalRelationId(v.payment_method_id) !== optionalRelationId(defaults.payment_method_id)) return true;
  if (optionalRelationId(v.payment_terms_id) !== optionalRelationId(defaults.payment_terms_id)) return true;
  if (optionalRelationId(v.vat_group_id) !== optionalRelationId(defaults.vat_group_id)) return true;
  if (isActive !== Boolean(defaults.is_active)) return true;
  if (isVat !== Boolean(defaults.is_vat_registered)) return true;
  if (isExempt !== Boolean(defaults.is_exempted)) return true;
  if (vat !== String(defaults.vat_number ?? "").trim()) return true;
  if (exemption !== String(defaults.exemption_reason ?? "").trim()) return true;
  if (dateFingerprint(v.exempted_from) !== dateFingerprint(defaults.exempted_from)) return true;
  if (dateFingerprint(v.exempted_to) !== dateFingerprint(defaults.exempted_to)) return true;
  if (notes !== String(defaults.notes ?? "").trim()) return true;
  if (
    currencyBalancesFingerprint(
      mergeCreditAndOpeningRows(
        /** @type {unknown[]} */ (v.currency_credit_limits ?? []),
        /** @type {unknown[]} */ (v.currency_opening_balances ?? []),
      ),
    ) !==
    currencyBalancesFingerprint(
      mergeCreditAndOpeningRows(
        /** @type {unknown[]} */ (defaults.currency_credit_limits ?? []),
        /** @type {unknown[]} */ (defaults.currency_opening_balances ?? []),
      ),
    )
  ) {
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
  const company = String(v.company_name ?? "").trim();
  const email = String(v.email ?? "").trim();
  const phone = String(v.phone ?? "").trim();
  const isActive = v.is_active !== false;
  const isVat = v.is_vat_registered === true;
  const isExempt = v.is_exempted === true;
  const vat = String(v.vat_number ?? "").trim();
  const exemption = String(v.exemption_reason ?? "").trim();
  const notes = String(v.notes ?? "").trim();

  if (name !== String(row.name ?? "").trim()) return true;
  if (company !== String(row.company_name ?? "").trim()) return true;
  if (email !== String(row.email ?? "").trim()) return true;
  if (phone !== String(row.phone ?? "").trim()) return true;
  if (optionalRelationId(v.supplier_group_id) !== optionalRelationId(row.supplier_group_id)) return true;
  if (optionalRelationId(v.payment_method_id) !== optionalRelationId(row.payment_method_id)) return true;
  if (optionalRelationId(v.payment_terms_id) !== optionalRelationId(row.payment_terms_id)) return true;
  if (optionalRelationId(v.vat_group_id) !== optionalRelationId(row.vat_group_id)) return true;
  if (isActive !== Boolean(row.is_active)) return true;
  if (isVat !== Boolean(row.is_vat_registered)) return true;
  if (isExempt !== Boolean(row.is_exempted)) return true;
  if (vat !== String(row.vat_number ?? "").trim()) return true;
  if (exemption !== String(row.exemption_reason ?? "").trim()) return true;
  if (dateFingerprint(v.exempted_from) !== dateFingerprint(row.exempted_from)) return true;
  if (dateFingerprint(v.exempted_to) !== dateFingerprint(row.exempted_to)) return true;
  if (notes !== String(row.notes ?? "").trim()) return true;
  if (
    currencyBalancesFingerprint(
      mergeCreditAndOpeningRows(
        /** @type {unknown[]} */ (v.currency_credit_limits ?? []),
        /** @type {unknown[]} */ (v.currency_opening_balances ?? []),
      ),
    ) !== currencyBalancesFingerprint(/** @type {unknown[]} */ (row.currency_balances ?? []))
  ) {
    return true;
  }
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
    company_name: row.company_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    supplier_group_id: row.supplier_group_id,
    supplier_group: row.supplier_group && typeof row.supplier_group === "object" ? row.supplier_group : null,
    payment_method_id: row.payment_method_id ?? null,
    payment_terms_id: row.payment_terms_id ?? null,
    vat_group_id: row.vat_group_id ?? null,
    credit_limit: row.credit_limit,
    opening_balance: row.opening_balance,
    balance: row.balance,
    currency_balances: Array.isArray(row.currency_balances) ? row.currency_balances : [],
    is_active: Boolean(row.is_active),
    is_vat_registered: Boolean(row.is_vat_registered),
    is_exempted: Boolean(row.is_exempted),
    exemption_reason: row.exemption_reason ?? null,
    exempted_from: row.exempted_from ?? null,
    exempted_to: row.exempted_to ?? null,
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

/** @param {Record<string, unknown>} row */
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
export function supplierFormValuesToPayload(values, mode) {
  const name = String(values.name ?? "").trim();
  const companyRaw = String(values.company_name ?? "").trim();
  const emailRaw = String(values.email ?? "").trim();
  const phoneRaw = String(values.phone ?? "").trim();
  const vatNumRaw = String(values.vat_number ?? "").trim();
  const exemptionRaw = String(values.exemption_reason ?? "").trim();
  const notesRaw = String(values.notes ?? "").trim();
  const isVat = values.is_vat_registered === true;
  const isExempt = values.is_exempted === true;

  const merged = mergeCreditAndOpeningRows(
    /** @type {unknown[]} */ (values.currency_credit_limits ?? []),
    /** @type {unknown[]} */ (values.currency_opening_balances ?? []),
  );
  const currency_balances = merged
    .map((row) => mapMergedBalanceToPayload(/** @type {Record<string, unknown>} */ (row)))
    .filter(Boolean);

  /** @type {Record<string, unknown>} */
  const exemptedFrom = values.exempted_from;
  const exemptedTo = values.exempted_to;

  const base = {
    name,
    company_name: companyRaw === "" ? null : companyRaw,
    email: emailRaw === "" ? null : emailRaw,
    phone: phoneRaw === "" ? null : phoneRaw,
    supplier_group_id: optionalRelationId(values.supplier_group_id),
    payment_method_id: optionalRelationId(values.payment_method_id),
    payment_terms_id: optionalRelationId(values.payment_terms_id),
    vat_group_id: optionalRelationId(values.vat_group_id),
    currency_balances,
    is_active: values.is_active !== false,
    is_vat_registered: isVat,
    vat_number: isVat ? (vatNumRaw === "" ? null : vatNumRaw.slice(0, 128)) : null,
    is_exempted: isExempt,
    exemption_reason: isExempt ? (exemptionRaw === "" ? null : exemptionRaw) : null,
    exempted_from:
      isExempt && exemptedFrom
        ? dayjs(exemptedFrom).isValid()
          ? dayjs(exemptedFrom).format("YYYY-MM-DD")
          : String(exemptedFrom).slice(0, 10)
        : null,
    exempted_to:
      isExempt && exemptedTo
        ? dayjs(exemptedTo).isValid()
          ? dayjs(exemptedTo).format("YYYY-MM-DD")
          : String(exemptedTo).slice(0, 10)
        : null,
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
  const creditStr = primaryRow
    ? String(Number(primaryRow.credit_limit ?? 0).toFixed(4))
    : String(Number(primaryFromApi ?? 0).toFixed(4));
  const openingStr = primaryRow
    ? String(Number(primaryRow.opening_balance ?? 0).toFixed(4))
    : String(Number(primaryFromApi ?? 0).toFixed(4));
  const openingNum = Number(openingStr);
  const balanceGuess = Number.isFinite(openingNum) ? openingNum.toFixed(4) : "0.0000";
  return {
    credit_limit: creditStr,
    opening_balance: openingStr,
    balance: balanceGuess,
  };
}
