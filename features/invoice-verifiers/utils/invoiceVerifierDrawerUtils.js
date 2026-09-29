/*
 * Invoice verifier drawer helpers (no React).
 */

export const INVOICE_VERIFIER_ROLES = /** @type {const} */ (["auditor", "tax_authority", "financier"]);
export const INVOICE_VERIFIER_ROLE_COLORS = { auditor: "blue", tax_authority: "purple", financier: "gold" };
export const INVOICE_VERIFIER_STATUS_COLORS = {
  pending: "processing",
  active: "success",
  failed: "error",
  removing: "warning",
};

export const INVOICE_VERIFIER_CREATE_SAVE_INTENT_KEY = "invoiceVerifierDrawer:createSaveIntent";
export const INVOICE_VERIFIER_CREATE_SAVE_INTENT_EVENT = "invoiceVerifierDrawer:createSaveIntent:change";

export const INVOICE_VERIFIER_DEFAULTS = Object.freeze({
  name: "",
  role: undefined,
  wallet_address: "",
  wallet_type: "wallet",
  email: "",
  phone: "",
  notes: "",
});

const EDITABLE_KEYS = ["name", "role", "email", "phone", "notes"];
const CREATE_KEYS = [...EDITABLE_KEYS, "wallet_address", "wallet_type"];

/** @param {unknown} val */
function normalizeScalar(val) {
  if (val == null) return "";
  return String(val).trim();
}

/** @param {unknown} value */
function emptyToNull(value) {
  const trimmed = normalizeScalar(value);
  return trimmed === "" ? null : trimmed;
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} baseline
 */
export function isCreateDirtyVsDefaults(form, baseline) {
  const v = form.getFieldsValue(true);
  return CREATE_KEYS.some((k) => normalizeScalar(v[k]) !== normalizeScalar(baseline[k]));
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  const v = form.getFieldsValue(true);
  return EDITABLE_KEYS.some((k) => normalizeScalar(v[k]) !== normalizeScalar(row[k]));
}

/** @param {Record<string, unknown>} r */
export function invoiceVerifierToFormValues(r) {
  return {
    name: r.name ?? "",
    role: r.role ?? undefined,
    wallet_address: r.wallet_address ?? "",
    wallet_type: r.wallet_type === "safe" ? "safe" : "wallet",
    email: r.email ?? "",
    phone: r.phone ?? "",
    notes: r.notes ?? "",
  };
}

/**
 * Create sends the wallet; update never does (it is fixed after create).
 * @param {Record<string, unknown>} values
 * @param {boolean} isCreate
 */
export function invoiceVerifierFormValuesToPayload(values, isCreate) {
  const payload = {
    name: normalizeScalar(values.name),
    role: String(values.role ?? ""),
    email: emptyToNull(values.email),
    phone: emptyToNull(values.phone),
    notes: emptyToNull(values.notes),
  };
  if (!isCreate) return payload;
  return {
    ...payload,
    wallet_address: normalizeScalar(values.wallet_address),
    wallet_type: values.wallet_type === "safe" ? "safe" : "wallet",
  };
}

/** @param {unknown[]} rows */
export function hasSyncingVerifier(rows) {
  return rows.some(
    (row) =>
      row &&
      typeof row === "object" &&
      (/** @type {{ chain_status?: string }} */ (row).chain_status === "pending" ||
        /** @type {{ chain_status?: string }} */ (row).chain_status === "removing"),
  );
}

/** @param {string} address */
export function shortWalletAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
