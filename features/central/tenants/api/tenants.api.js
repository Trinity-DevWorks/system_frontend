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
 * Assigned module codes plus the full catalog (`available`).
 * @param {string} id
 * @returns {Promise<{ tenant_id: string; modules: string[]; available: Record<string, unknown>[] }>}
 */
export function fetchCentralTenantModules(id) {
  return centralRequest("GET", `tenants/${encodeURIComponent(id)}/modules`);
}

/**
 * Replace the tenant's module entitlements (`core` is always kept by the backend).
 * @param {string} id
 * @param {string[]} modules
 * @returns {Promise<{ tenant_id: string; modules: string[]; available: Record<string, unknown>[] }>}
 */
export function updateCentralTenantModules(id, modules) {
  return centralRequest("PUT", `tenants/${encodeURIComponent(id)}/modules`, { modules });
}
