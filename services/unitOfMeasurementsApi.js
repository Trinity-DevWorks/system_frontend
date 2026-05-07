import tenantApiService from "@/API/TenantApiService";

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchUnitOfMeasurements() {
  const data = await tenantApiService("GET", "unit-of-measurements");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchUnitOfMeasurement(id) {
  return tenantApiService("GET", `unit-of-measurements/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createUnitOfMeasurement(body) {
  return tenantApiService("POST", "unit-of-measurements", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateUnitOfMeasurement(id, body) {
  return tenantApiService("PUT", `unit-of-measurements/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteUnitOfMeasurement(id) {
  return tenantApiService("DELETE", `unit-of-measurements/${id}`);
}
