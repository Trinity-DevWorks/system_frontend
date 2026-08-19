import tenantApiService from "@/API/TenantApiService";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchUnitOfMeasurements(params = {}) {
  return fetchPaginatedResource("unit-of-measurements", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchUnitOfMeasurementNames() {
  return fetchResourceNames("unit-of-measurements");
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
