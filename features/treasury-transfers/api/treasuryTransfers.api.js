import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchTreasuryTransfers(params = {}) {
  return fetchPaginatedResource("treasury-transfers", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchTreasuryTransferNames() {
  return fetchResourceNames("treasury-transfers");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchTreasuryTransfer(id) {
  return tenantRequest("GET", `treasury-transfers/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createTreasuryTransfer(body) {
  return tenantRequest("POST", "treasury-transfers", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateTreasuryTransfer(id, body) {
  return tenantRequest("PUT", `treasury-transfers/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteTreasuryTransfer(id) {
  return tenantRequest("DELETE", `treasury-transfers/${id}`);
}

/** @param {string} id */
export function postTreasuryTransfer(id) {
  return tenantRequest("POST", `treasury-transfers/${id}/post`);
}

/** @param {string} id */
export function reverseTreasuryTransfer(id) {
  return tenantRequest("POST", `treasury-transfers/${id}/reverse`);
}
