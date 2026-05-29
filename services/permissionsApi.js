import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchPermissions() {
  const data = await tenantApiService("GET", "permissions");
  return Array.isArray(data) ? data : [];
}
