import { tenantApiClient } from "@/lib/axios";
import tenantApiService from "@/API/TenantApiService";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   supplier_id?: string;
 *   warehouse_id?: number;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchPurchaseOrders(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantApiService("GET", qs ? `stock/purchase-orders?${qs}` : "stock/purchase-orders");
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createPurchaseOrder(body) {
  return tenantApiService("POST", "stock/purchase-orders", body);
}

/**
 * @param {{
 *   replenishment_ids: number[];
 *   supplier_overrides?: Record<number | string, string>;
 *   preview?: boolean;
 * }} body
 * @returns {Promise<{
 *   groups: Array<Record<string, unknown>>;
 *   skipped: Array<Record<string, unknown>>;
 *   purchase_orders: Array<Record<string, unknown>>;
 * }>}
 */
export async function createPurchaseOrdersFromAlerts(body) {
  const data = await tenantApiService("POST", "stock/purchase-orders/from-alerts", body);
  if (data && typeof data === "object") {
    return /** @type {{ groups: Array<Record<string, unknown>>; skipped: Array<Record<string, unknown>>; purchase_orders: Array<Record<string, unknown>> }} */ (
      data
    );
  }
  return { groups: [], skipped: [], purchase_orders: [] };
}

/**
 * @param {string} orderId
 * @returns {Promise<unknown>}
 */
export function fetchPurchaseOrder(orderId) {
  return tenantApiService("GET", `stock/purchase-orders/${orderId}`);
}

/**
 * @param {string} orderId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updatePurchaseOrder(orderId, body) {
  return tenantApiService("PUT", `stock/purchase-orders/${orderId}`, body);
}

/**
 * @param {string} orderId
 * @returns {Promise<unknown>}
 */
export function deletePurchaseOrder(orderId) {
  return tenantApiService("DELETE", `stock/purchase-orders/${orderId}`);
}

/**
 * @param {string} orderId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 * @returns {Promise<unknown[]>}
 */
export async function syncPurchaseOrderLines(orderId, body) {
  const data = await tenantApiService("PUT", `stock/purchase-orders/${orderId}/lines/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} orderId
 * @returns {Promise<unknown>}
 */
export function confirmPurchaseOrder(orderId) {
  return tenantApiService("POST", `stock/purchase-orders/${orderId}/confirm`);
}

/**
 * @param {string} orderId
 * @returns {Promise<unknown>}
 */
export function cancelPurchaseOrder(orderId) {
  return tenantApiService("POST", `stock/purchase-orders/${orderId}/cancel`);
}

/**
 * @param {string} orderId
 * @returns {Promise<Blob>}
 */
export async function fetchPurchaseOrderPdf(orderId) {
  const res = await tenantApiClient.get(`stock/purchase-orders/${orderId}/pdf`, {
    responseType: "blob",
    timeout: 120_000,
  });
  return res.data;
}

/**
 * @param {string} orderId
 * @returns {Promise<unknown>}
 */
export function markPurchaseOrderAsSent(orderId) {
  return tenantApiService("POST", `stock/purchase-orders/${orderId}/mark-sent`);
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function savePurchaseOrderPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * @param {string} orderId
 * @param {string} [poNumber]
 */
export async function downloadPurchaseOrderPdf(orderId, poNumber) {
  const blob = await fetchPurchaseOrderPdf(orderId);
  const baseName = typeof poNumber === "string" && poNumber.trim() ? poNumber.trim() : "purchase-order";
  savePurchaseOrderPdfBlob(blob, `${baseName}.pdf`);
}
