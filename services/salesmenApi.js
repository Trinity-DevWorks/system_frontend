import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchSalesmen() {
  const data = await tenantApiService("GET", "salesmen");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchSalesman(id) {
  return tenantApiService("GET", `salesmen/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSalesman(body) {
  return tenantApiService("POST", "salesmen", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSalesman(id, body) {
  return tenantApiService("PUT", `salesmen/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteSalesman(id) {
  return tenantApiService("DELETE", `salesmen/${id}`);
}
