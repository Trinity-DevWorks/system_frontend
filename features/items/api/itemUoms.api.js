import { tenantRequest } from "@/lib/axios";

/**
 * @param {number | string} itemId
 * @returns {Promise<unknown[]>}
 */
export async function fetchItemUoms(itemId) {
  const data = await tenantRequest("GET", `items/${itemId}/item-uoms`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} itemId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createItemUom(itemId, body) {
  return tenantRequest("POST", `items/${itemId}/item-uoms`, body);
}

/**
 * @param {number | string} itemId
 * @param {number | string} itemUomId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateItemUom(itemId, itemUomId, body) {
  return tenantRequest("PUT", `items/${itemId}/item-uoms/${itemUomId}`, body);
}

/**
 * @param {number | string} itemId
 * @param {number | string} itemUomId
 * @returns {Promise<unknown>}
 */
export function deleteItemUom(itemId, itemUomId) {
  return tenantRequest("DELETE", `items/${itemId}/item-uoms/${itemUomId}`);
}
