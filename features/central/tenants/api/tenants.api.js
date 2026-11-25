import { centralRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] `search`, `status`, `page`, `per_page` */
export function fetchCentralTenants(params = {}) {
  return fetchPaginatedResource("tenants", params, centralRequest);
}

/**
 * Tenant detail including modules and owner.
 * @param {string} id
 * @returns {Promise<unknown>}
 */
export function fetchCentralTenant(id) {
  return centralRequest("GET", `tenants/${encodeURIComponent(id)}`);
}

/**
 * Provision a tenant (schema, domain, owner user).
 * @param {{ name: string; domain: string; email: string; password: string; password_confirmation: string }} body
 * @returns {Promise<unknown>}
 */
export function createCentralTenant(body) {
  return centralRequest("POST", "tenants", body);
}

/**
 * @param {string} id
 * @param {{ name: string }} body
 * @returns {Promise<unknown>}
 */
export function updateCentralTenant(id, body) {
  return centralRequest("PUT", `tenants/${encodeURIComponent(id)}`, body);
}

/**
 * @param {string} id
 * @param {{ status: "active" | "suspended"; reason?: string | null }} body
 * @returns {Promise<unknown>}
 */
export function updateCentralTenantStatus(id, body) {
  return centralRequest("PATCH", `tenants/${encodeURIComponent(id)}/status`, body);
}

/**
 * Permanently delete a suspended tenant. `confirmation` must equal the tenant id.
 * @param {string} id
 * @param {string} confirmation
 * @returns {Promise<unknown>}
 */
export function deleteCentralTenant(id, confirmation) {
  return centralRequest("DELETE", `tenants/${encodeURIComponent(id)}`, { confirmation });
}

/**
 * Assigned module codes (read-only: they follow the plan) plus the full catalog (`available`).
 * @param {string} id
 * @returns {Promise<{ tenant_id: string; modules: string[]; available: Record<string, unknown>[] }>}
 */
export function fetchCentralTenantModules(id) {
  return centralRequest("GET", `tenants/${encodeURIComponent(id)}/modules`);
}

/**
 * Change plan and / or subscription dates; the tenant's modules follow the plan.
 *
 * @param {string} id
 * @param {{ plan_id: number, subscription_starts_at: string | null, subscription_ends_at: string | null, trial_ends_at: string | null }} body
 * @returns {Promise<Record<string, unknown>>}
 */
export function updateCentralTenantSubscription(id, body) {
  return centralRequest("PUT", `tenants/${encodeURIComponent(id)}/subscription`, body);
}

/**
 * The tenant's users (read-only): owner flag, roles, last login.
 * @param {string} id
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function fetchCentralTenantUsers(id) {
  const data = await centralRequest("GET", `tenants/${encodeURIComponent(id)}/users`);
  return Array.isArray(data) ? data : [];
}

/**
 * Emails a password-reset link to the user and returns it once for the central admin.
 * @param {string} id tenant id
 * @param {string} userId
 * @returns {Promise<{ email: string, url: string, expires_at: string, email_sent: boolean }>}
 */
export function sendCentralTenantUserResetLink(id, userId) {
  return centralRequest(
    "POST",
    `tenants/${encodeURIComponent(id)}/users/${encodeURIComponent(userId)}/password-reset`,
  );
}

/**
 * Makes the user an Owner; with `demoteOthers` the current owner(s) become Admin.
 * @param {string} id tenant id
 * @param {string} userId
 * @param {boolean} demoteOthers
 * @returns {Promise<{ users: Record<string, unknown>[], owner: Record<string, unknown> | null }>}
 */
export function makeCentralTenantOwner(id, userId, demoteOthers) {
  return centralRequest(
    "POST",
    `tenants/${encodeURIComponent(id)}/users/${encodeURIComponent(userId)}/make-owner`,
    { demote_others: demoteOthers },
  );
}
