/*
 * Plain helper functions and small constants for the central tenant drawer (no React).
 */

import dayjs from "@/lib/dayjs";

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
  plan_id: undefined,
  subscription_starts_at: undefined,
  subscription_ends_at: undefined,
  trial_ends_at: undefined,
});

/** API date format for subscription fields. */
const API_DATE = "YYYY-MM-DD";

/** @param {import("dayjs").Dayjs | null | undefined} value */
function dateOrNull(value) {
  return value && typeof value.format === "function" ? value.format(API_DATE) : null;
}

/** @param {unknown} value API date string */
export function toDayjsOrNull(value) {
  if (typeof value !== "string" || value === "") return null;
  const d = dayjs(value, API_DATE);
  return d.isValid() ? d : null;
}

/**
 * End of one billing period from `start` (mirrors backend `BillingCycle::periodEnd`).
 *
 * @param {import("dayjs").Dayjs} start
 * @param {unknown} cycle `monthly` | `yearly`
 */
export function subscriptionPeriodEnd(start, cycle) {
  return cycle === "yearly" ? start.add(1, "year") : start.add(1, "month");
}

/**
 * Subscription fields from a form (dayjs values) to the API shape. An empty end date = no end.
 *
 * @param {Record<string, unknown>} values
 */
export function subscriptionValuesToPayload(values) {
  return {
    plan_id: Number(values.plan_id),
    subscription_starts_at: dateOrNull(/** @type {any} */ (values.subscription_starts_at)),
    subscription_ends_at: dateOrNull(/** @type {any} */ (values.subscription_ends_at)),
    trial_ends_at: dateOrNull(/** @type {any} */ (values.trial_ends_at)),
  };
}

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
    ...subscriptionValuesToPayload(values),
  };
}

/**
 * @param {import("antd").FormInstance} form
 */
export function isTenantCreateDirty(form) {
  const v = form.getFieldsValue(true);
  return (
    ["name", "domain", "email", "password", "password_confirmation"].some(
      (key) => String(v[key] ?? "").trim() !== "",
    ) || v.plan_id != null
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
    plan: row.plan && typeof row.plan === "object" ? row.plan : null,
    subscription_starts_at: row.subscription_starts_at ?? null,
    subscription_ends_at: row.subscription_ends_at ?? null,
    trial_ends_at: row.trial_ends_at ?? null,
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

