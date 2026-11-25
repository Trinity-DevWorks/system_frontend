import { centralRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] `search`, `status`, `page`, `per_page` */
export function fetchCentralTenantUsage(params = {}) {
  return fetchPaginatedResource("tenants/usage", params, centralRequest);
}

/** Recalculates every tenant now. @returns {Promise<{ refreshed: number, failed: string[] }>} */
export function refreshAllTenantUsage() {
  return centralRequest("POST", "tenants/usage/refresh");
}

/** @param {string} tenantId @returns {Promise<Record<string, unknown>>} the refreshed row */
export function refreshTenantUsage(tenantId) {
  return centralRequest("POST", `tenants/${encodeURIComponent(tenantId)}/usage/refresh`);
}
