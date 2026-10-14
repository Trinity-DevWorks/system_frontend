/*
 * Plain helpers for the currency drawer (no React).
 */

/** @typedef {"keep" | "new" | "close"} CurrencyCreateSaveIntent */

export const CURRENCY_CREATE_SAVE_INTENT_KEY = "currencyDrawer:createSaveIntent";
export const CURRENCY_CREATE_SAVE_INTENT_EVENT = "currencyDrawer:createSaveIntent:change";

/** @param {unknown} v */
function numStr(v) {
  if (v == null || v === "") return "";
  return String(v);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  const v = form.getFieldsValue(true);
  const keys = [
    "name",
    "code",
    "iso_code",
    "symbol",
    "is_active",
    "is_primary",
    "smallest_unit",
    "round_limit",
    "acceptable_amount_overdue",
    "allowed_difference_in_receipt",
    "allowed_difference_in_payment",
  ];
  for (const k of keys) {
    const a = k === "is_active" || k === "is_primary" ? Boolean(v[k]) : numStr(v[k]);
    const b = k === "is_active" || k === "is_primary" ? Boolean(defaults[k]) : numStr(defaults[k]);
    if (a !== b) return true;
  }
  return false;
}

/**
 * Form values applied when a currency record is loaded into the drawer.
 * Numeric columns are numbers so they match what the inputs store.
 *
 * @param {Record<string, unknown>} r
 */
export function mapCurrencyRecordToFormValues(r) {
  const asNumber = (/** @type {unknown} */ value) =>
    value != null && value !== "" ? Number(value) : undefined;
  return {
    name: r.name,
    code: r.code,
    iso_code: r.iso_code,
    symbol: r.symbol ?? undefined,
    is_active: r.is_active !== false,
    is_primary: Boolean(r.is_primary),
    smallest_unit: asNumber(r.smallest_unit),
    round_limit: asNumber(r.round_limit),
    acceptable_amount_overdue: asNumber(r.acceptable_amount_overdue),
    allowed_difference_in_receipt: asNumber(r.allowed_difference_in_receipt),
    allowed_difference_in_payment: asNumber(r.allowed_difference_in_payment),
  };
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const current = currencyFormValuesToPayload(form.getFieldsValue(true), { mode: "edit" });
  const loaded = currencyFormValuesToPayload(mapCurrencyRecordToFormValues(row), { mode: "edit" });
  return JSON.stringify(current) !== JSON.stringify(loaded);
}

/**
 * @param {string} name
 * @param {string} code
 * @param {string} isoCode
 */
export function requiredFieldsValid(name, code, isoCode) {
  return (
    String(name ?? "").trim().length > 0 &&
    String(code ?? "").trim().length > 0 &&
    String(isoCode ?? "").trim().length > 0
  );
}

/** @param {Record<string, unknown>} row */
export function toCurrencyCacheRow(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    iso_code: row.iso_code,
    symbol: row.symbol,
    smallest_unit: row.smallest_unit,
    round_limit: row.round_limit,
    acceptable_amount_overdue: row.acceptable_amount_overdue,
    allowed_difference_in_receipt: row.allowed_difference_in_receipt,
    allowed_difference_in_payment: row.allowed_difference_in_payment,
    is_active: row.is_active,
    is_primary: row.is_primary,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** @param {unknown[]} list */
export function sortCurrenciesByCode(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ code?: string }} */ (a).code ?? "").localeCompare(
      String(/** @type {{ code?: string }} */ (b).code ?? ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/**
 * @param {Record<string, unknown>} values
 * @param {{ mode: "create" | "edit"; currencyId?: number | null }} ctx
 * @returns {Record<string, unknown>}
 */
export function currencyFormValuesToPayload(values, ctx) {
  const isPrimary = Boolean(values.is_primary);
  /** @type {Record<string, unknown>} */
  const base = {
    name: String(values.name ?? "").trim(),
    code: String(values.code ?? "").trim(),
    iso_code: String(values.iso_code ?? "").trim(),
    symbol:
      values.symbol != null && String(values.symbol).trim() !== "" ? String(values.symbol).trim() : null,
    is_active: values.is_active !== false,
    is_primary: isPrimary,
    smallest_unit:
      values.smallest_unit != null && values.smallest_unit !== ""
        ? String(values.smallest_unit)
        : null,
    round_limit:
      values.round_limit != null && values.round_limit !== "" ? String(values.round_limit) : null,
    acceptable_amount_overdue:
      values.acceptable_amount_overdue != null && values.acceptable_amount_overdue !== ""
        ? String(values.acceptable_amount_overdue)
        : null,
    allowed_difference_in_receipt:
      values.allowed_difference_in_receipt != null && values.allowed_difference_in_receipt !== ""
        ? String(values.allowed_difference_in_receipt)
        : null,
    allowed_difference_in_payment:
      values.allowed_difference_in_payment != null && values.allowed_difference_in_payment !== ""
        ? String(values.allowed_difference_in_payment)
        : null,
  };

  if (!isPrimary) {
    const rate = Number(values.rate);
    const fromId = values.from_currency_id;
    if (Number.isFinite(rate) && rate > 0 && fromId != null && fromId !== "") {
      base.rate = rate;
      base.from_currency_id = Number(fromId);
      const toId = values.to_currency_id;
      if (toId != null && toId !== "" && ctx.mode === "edit" && ctx.currencyId != null) {
        const toNum = Number(toId);
        if (toNum !== Number(ctx.currencyId)) {
          base.to_currency_id = toNum;
        }
      }
    }
  }

  return base;
}
