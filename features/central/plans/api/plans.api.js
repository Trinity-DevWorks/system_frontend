import { centralRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchCentralPlans(params = {}) {
  return fetchPaginatedResource("plans", params, centralRequest);
}

/** @returns {Promise<unknown[]>} every plan (active and inactive), for selects */
export function fetchCentralPlanNames() {
  return fetchResourceNames("plans", centralRequest);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchCentralPlan(id) {
  return centralRequest("GET", `plans/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createCentralPlan(body) {
  return centralRequest("POST", "plans", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateCentralPlan(id, body) {
  return centralRequest("PUT", `plans/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteCentralPlan(id) {
  return centralRequest("DELETE", `plans/${id}`);
}
