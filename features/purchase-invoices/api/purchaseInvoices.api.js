import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   supplier_id?: string;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchPurchaseInvoices(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest(
    "GET",
    qs ? `purchase-invoices?${qs}` : "purchase-invoices",
  );
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createPurchaseInvoice(body) {
  return tenantRequest("POST", "purchase-invoices", body);
}

/**
 * @param {string} invoiceId
 */
export function fetchPurchaseInvoice(invoiceId) {
  return tenantRequest("GET", `purchase-invoices/${invoiceId}`);
}

/**
 * @param {string} invoiceId
 * @param {Record<string, unknown>} body
 */
export function updatePurchaseInvoice(invoiceId, body) {
  return tenantRequest("PUT", `purchase-invoices/${invoiceId}`, body);
}

/**
 * @param {string} invoiceId
 */
export function deletePurchaseInvoice(invoiceId) {
  return tenantRequest("DELETE", `purchase-invoices/${invoiceId}`);
}

/**
 * @param {string} invoiceId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export async function syncPurchaseInvoiceLines(invoiceId, body) {
  const data = await tenantRequest("PUT", `purchase-invoices/${invoiceId}/lines/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} invoiceId
 */
export function postPurchaseInvoice(invoiceId) {
  return tenantRequest("POST", `purchase-invoices/${invoiceId}/post`);
}
