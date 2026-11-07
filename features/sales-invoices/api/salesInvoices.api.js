import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";
import { downloadPdf } from "@/shared/api/downloadPdf";
import { documentPdfFilename } from "@/shared/utils/documentPdf";

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
/**
 * Payments taken when the invoice is posted (split payment).
 * @param {string} invoiceId
 * @param {{ payments: Record<string, unknown>[] }} body
 */
export function syncSalesInvoicePayments(invoiceId, body) {
  return tenantRequest("PUT", `sales-invoices/${invoiceId}/payments`, body);
}

/**
 * Money received later against a posted invoice; each row becomes a receipt.
 * @param {string} invoiceId
 * @param {{ payments: Record<string, unknown>[]; payment_date?: string }} body
 */
export function recordSalesInvoicePayments(invoiceId, body) {
  return tenantRequest("POST", `sales-invoices/${invoiceId}/payments/record`, body);
}

/**
 * The customer's credit (posted receipts with money left), each with its value in `currencyId`.
 * @param {string} customerId
 * @param {unknown} currencyId
 * @returns {Promise<Array<{ receipt_id: string; receipt_number: string; unapplied_amount: string; currency_code: string; in_invoice_currency: string | null }>>}
 */
export async function fetchCustomerAvailableCredit(customerId, currencyId) {
  const qs = new URLSearchParams({ customer_id: String(customerId) });
  if (currencyId != null && currencyId !== "") qs.set("currency_id", String(currencyId));
  const data = await tenantRequest("GET", `customer-receipts/available-credit?${qs.toString()}`);
  return Array.isArray(data) ? data : [];
}

export function postSalesInvoice(invoiceId, body = undefined) {
  return tenantRequest("POST", `sales-invoices/${invoiceId}/post`, body);
}

/** @param {string} invoiceId */
export function reverseSalesInvoice(invoiceId) {
  return tenantRequest("POST", `sales-invoices/${invoiceId}/reverse`);
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

/**
 * @param {string} invoiceId
 * @param {string} [documentNumber]
 * @param {{ locale?: string }} [options]
 */
export async function downloadSalesInvoicePdf(invoiceId, documentNumber, options = {}) {
  await downloadPdf(`sales-invoices/${invoiceId}/pdf`, documentPdfFilename(documentNumber, "sales-invoice"), options);
}
