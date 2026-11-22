import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

export const SCALE_BARCODE_FORMATS_QUERY_KEY = /** @type {const} */ (["tenant", "scale-barcode-formats"]);

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchScaleBarcodeFormats(params = {}) {
  return fetchPaginatedResource("scale-barcode-formats", params);
}

/** @param {number | string} id */
export function fetchScaleBarcodeFormat(id) {
  return tenantRequest("GET", `scale-barcode-formats/${encodeURIComponent(String(id))}`);
}

/** @param {Record<string, unknown>} body */
export function createScaleBarcodeFormat(body) {
  return tenantRequest("POST", "scale-barcode-formats", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 */
export function updateScaleBarcodeFormat(id, body) {
  return tenantRequest("PUT", `scale-barcode-formats/${encodeURIComponent(String(id))}`, body);
}

/** @param {number | string} id */
export function deleteScaleBarcodeFormat(id) {
  return tenantRequest("DELETE", `scale-barcode-formats/${encodeURIComponent(String(id))}`);
}

/**
 * Try a barcode against an unsaved format.
 *
 * @param {Record<string, unknown>} format
 * @param {string} barcode
 */
export function testScaleBarcode(format, barcode) {
  return tenantRequest("POST", "scale-barcode-formats/test", { ...format, barcode });
}
