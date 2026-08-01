import { tenantApiClient } from "@/lib/axios";
import tenantApiService from "@/API/TenantApiService";

/**
 * @param {{
 *   status?: string;
 *   supplier_id?: string;
 *   warehouse_id?: number;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   limit?: number;
 * }} [params]
 * @returns {Promise<unknown[]>}
 */
export async function fetchPurchaseOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.supplier_id) query.set("supplier_id", params.supplier_id);
  if (params.warehouse_id != null) query.set("warehouse_id", String(params.warehouse_id));
  if (params.search) query.set("search", params.search);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.limit != null) query.set("limit", String(params.limit));

  const qs = query.toString();
  const endpoint = qs ? `stock/purchase-orders?${qs}` : "stock/purchase-orders";
  const data = await tenantApiService("GET", endpoint);
  return Array.isArray(data) ? data : [];
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
