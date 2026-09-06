import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   customer_id?: string;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchSalesInvoices(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `sales-invoices?${qs}` : "sales-invoices");
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createSalesInvoice(body) {
  return tenantRequest("POST", "sales-invoices", body);
}

/**
 * @param {string} invoiceId
 */
export function fetchSalesInvoice(invoiceId) {
  return tenantRequest("GET", `sales-invoices/${invoiceId}`);
}

/**
 * @param {string} invoiceId
 * @param {Record<string, unknown>} body
 */
export function updateSalesInvoice(invoiceId, body) {
  return tenantRequest("PUT", `sales-invoices/${invoiceId}`, body);
}

/**
 * @param {string} invoiceId
 */
export function deleteSalesInvoice(invoiceId) {
  return tenantRequest("DELETE", `sales-invoices/${invoiceId}`);
}

/**
 * @param {string} invoiceId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 * @returns {Promise<{ lines?: unknown[]; invoice?: Record<string, unknown> }>}
 */
export async function syncSalesInvoiceLines(invoiceId, body) {
  const data = await tenantRequest("PUT", `sales-invoices/${invoiceId}/lines/sync`, body);
  if (data && typeof data === "object") {
    return /** @type {{ lines?: unknown[]; invoice?: Record<string, unknown> }} */ (data);
  }
  return {};
}

/**
 * @param {string} invoiceId
 */
export function postSalesInvoice(invoiceId) {
  return tenantRequest("POST", `sales-invoices/${invoiceId}/post`);
}

/**
 * Warehouses (and lots) that currently hold the item.
 * @param {string} itemId
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchSalesInvoiceItemAvailability(itemId) {
  const data = await tenantRequest(
    "GET",
    `sales-invoices/item-availability?item_id=${encodeURIComponent(itemId)}`,
  );
  return Array.isArray(data) ? data : [];
}
