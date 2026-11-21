import { tenantRequest } from "@/lib/axios";

/**
 * Tenant home figures. Sections the user cannot view come back as null.
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchTenantOverview() {
  return tenantRequest("GET", "overview");
}
