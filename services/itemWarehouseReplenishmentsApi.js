import tenantApiService from "@/API/TenantApiService";

/**
 * @param {number | string} itemId
 * @returns {Promise<unknown[]>}
 */
export async function fetchItemWarehouseReplenishments(itemId) {
  const data = await tenantApiService("GET", `items/${itemId}/warehouse-replenishments`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} itemId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createItemWarehouseReplenishment(itemId, body) {
  return tenantApiService("POST", `items/${itemId}/warehouse-replenishments`, body);
}

/**
 * @param {number | string} itemId
 * @param {number | string} replenishmentId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateItemWarehouseReplenishment(itemId, replenishmentId, body) {
  return tenantApiService(
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
  return tenantApiService("DELETE", `items/${itemId}/warehouse-replenishments/${replenishmentId}`);
}
