/*
 * Plain helper functions and small constants for the central tenant drawer (no React).
 */

export const TENANT_CREATE_SAVE_INTENT_KEY = "centralTenantDrawer:createSaveIntent";
export const TENANT_CREATE_SAVE_INTENT_EVENT = "centralTenantDrawer:createSaveIntent:change";

export const TENANT_STATUS_ACTIVE = "active";
export const TENANT_STATUS_SUSPENDED = "suspended";

/** Always entitled; the backend re-adds it on every sync. */
export const CORE_MODULE_CODE = "core";

export const TENANT_CREATE_DEFAULTS = Object.freeze({
  name: "",
  domain: "",
  email: "",
  password: "",
  password_confirmation: "",
});

/** @param {unknown} status */
export function isTenantSuspended(status) {
  return status === TENANT_STATUS_SUSPENDED;
}

/**
 * @param {Record<string, unknown>} values
 */
export function tenantCreateValuesToPayload(values) {
  return {
    name: String(values.name ?? "").trim(),
    domain: String(values.domain ?? "").trim().toLowerCase(),
    email: String(values.email ?? "").trim(),
    password: String(values.password ?? ""),
    password_confirmation: String(values.password_confirmation ?? ""),
  };
}

/**
 * @param {import("antd").FormInstance} form
 */
export function isTenantCreateDirty(form) {
  const v = form.getFieldsValue(true);
  return ["name", "domain", "email", "password", "password_confirmation"].some(
    (key) => String(v[key] ?? "").trim() !== "",
  );
}

/** @param {Record<string, unknown>} row */
export function toTenantCacheRow(row) {
  return {
    id: row.id,
    name: row.name ?? null,
    status: row.status ?? TENANT_STATUS_ACTIVE,
    suspended_at: row.suspended_at ?? null,
    suspension_reason: row.suspension_reason ?? null,
    domains: Array.isArray(row.domains) ? row.domains : [],
    primary_domain: row.primary_domain ?? null,
    modules: Array.isArray(row.modules) ? row.modules : null,
    owner: row.owner && typeof row.owner === "object" ? row.owner : null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

/**
 * Catalog order, `core` first.
 * @param {Record<string, unknown>[]} available
 */
export function sortModuleCatalog(available) {
  return [...available].sort((a, b) => {
    if (a.code === CORE_MODULE_CODE) return -1;
    if (b.code === CORE_MODULE_CODE) return 1;
    const bySort = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    if (bySort !== 0) return bySort;
    return String(a.code ?? "").localeCompare(String(b.code ?? ""));
  });
}

/**
 * @param {string[]} a
 * @param {string[]} b
 */
export function sameModuleSet(a, b) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((code) => set.has(code));
}
