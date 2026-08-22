import { tenantRequest } from "@/lib/axios";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchPermissions() {
  const data = await tenantRequest("GET", "permissions");
  return Array.isArray(data) ? data : [];
}
