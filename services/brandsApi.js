import tenantApiService from "@/API/TenantApiService";

/**
 * @param {{ refresh?: boolean }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function fetchBrands({ refresh = false } = {}) {
  const endpoint = refresh ? "brands?refresh=1" : "brands";
  const data = await tenantApiService("GET", endpoint);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchBrand(id) {
  return tenantApiService("GET", `brands/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createBrand(body) {
  return tenantApiService("POST", "brands", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateBrand(id, body) {
  return tenantApiService("PUT", `brands/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteBrand(id) {
  return tenantApiService("DELETE", `brands/${id}`);
}
