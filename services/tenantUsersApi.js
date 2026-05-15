import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchTenantUsers() {
  const data = await tenantApiService("GET", "users");
  return Array.isArray(data) ? data : [];
}
