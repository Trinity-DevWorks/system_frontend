import { tenantRequest } from "@/lib/axios";

/**
 * @param {number | string} itemId
 * @returns {Promise<unknown[]>}
 */
export async function fetchItemWarehouseReplenishments(itemId) {
  const data = await tenantRequest("GET", `items/${itemId}/warehouse-replenishments`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} itemId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createItemWarehouseReplenishment(itemId, body) {
  return tenantRequest("POST", `items/${itemId}/warehouse-replenishments`, body);
}

/**
 * @param {number | string} itemId
 * @param {number | string} replenishmentId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateItemWarehouseReplenishment(itemId, replenishmentId, body) {
  return tenantRequest(
    "PUT",
    `items/${itemId}/warehouse-replenishments/${replenishmentId}`,
    body,
  );
}

/**
 * @param {number | string} itemId
 * @param {number | string} replenishmentId
 * @returns {Promise<unknown>}
 */
export function deleteItemWarehouseReplenishment(itemId, replenishmentId) {
  return tenantRequest("DELETE", `items/${itemId}/warehouse-replenishments/${replenishmentId}`);
}
