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
export async function fetchSalesCreditNotes(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `sales-credit-notes?${qs}` : "sales-credit-notes");
  return parsePaginatedList(payload, params);
}

/** @param {string} id */
export function fetchSalesCreditNote(id) {
  return tenantRequest("GET", `sales-credit-notes/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createSalesCreditNote(body) {
  return tenantRequest("POST", "sales-credit-notes", body);
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 */
export function updateSalesCreditNote(id, body) {
  return tenantRequest("PUT", `sales-credit-notes/${id}`, body);
}

/** @param {string} id */
export function deleteSalesCreditNote(id) {
  return tenantRequest("DELETE", `sales-credit-notes/${id}`);
}

/**
 * @param {string} id
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export function syncSalesCreditNoteLines(id, body) {
  return tenantRequest("PUT", `sales-credit-notes/${id}/lines/sync`, body);
}

/** @param {string} id */
export function postSalesCreditNote(id) {
  return tenantRequest("POST", `sales-credit-notes/${id}/post`);
}

/** @param {string} id */
export function reverseSalesCreditNote(id) {
  return tenantRequest("POST", `sales-credit-notes/${id}/reverse`);
}

/** @param {string | null | undefined} [customerId] */
export async function fetchSalesCreditNoteOpenInvoices(customerId) {
  const qs = toListQuery(customerId ? { customer_id: customerId } : {}).toString();
  const data = await tenantRequest("GET", qs ? `sales-credit-notes/open-invoices?${qs}` : "sales-credit-notes/open-invoices");
  return Array.isArray(data) ? data : [];
}

/** @param {string} invoiceId */
export async function fetchSalesCreditNoteSourceLines(invoiceId) {
  const data = await tenantRequest("GET", `sales-credit-notes/source/${invoiceId}`);
  return Array.isArray(data) ? data : [];
}
