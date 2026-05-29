import tenantApiService from "@/API/TenantApiService";

/**
 * @param {number | string} itemId
 * @returns {Promise<unknown[]>}
 */
export async function fetchItemBarcodes(itemId) {
  const data = await tenantApiService("GET", `items/${itemId}/barcodes`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} itemId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createItemBarcode(itemId, body) {
  return tenantApiService("POST", `items/${itemId}/barcodes`, body);
}

/**
 * @param {number | string} itemId
 * @param {number | string} barcodeId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateItemBarcode(itemId, barcodeId, body) {
  return tenantApiService("PUT", `items/${itemId}/barcodes/${barcodeId}`, body);
}

/**
 * @param {number | string} itemId
 * @param {number | string} barcodeId
 * @returns {Promise<unknown>}
 */
export function deleteItemBarcode(itemId, barcodeId) {
  return tenantApiService("DELETE", `items/${itemId}/barcodes/${barcodeId}`);
}

/**
 * POS / scan: resolve barcode to item + item_uom.
 * @param {string} barcode
 * @returns {Promise<unknown>}
 */
export function lookupItemByBarcode(barcode) {
  const encoded = encodeURIComponent(barcode);
  return tenantApiService("GET", `items/lookup-by-barcode?barcode=${encoded}`);
}
