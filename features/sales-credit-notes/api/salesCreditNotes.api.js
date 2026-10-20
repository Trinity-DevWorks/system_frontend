import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/** @param {Record<string, unknown>} [params] */
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

/** @param {string} id @param {Record<string, unknown>} body */
export function updateSalesCreditNote(id, body) {
  return tenantRequest("PUT", `sales-credit-notes/${id}`, body);
}

/** @param {string} id */
export function deleteSalesCreditNote(id) {
  return tenantRequest("DELETE", `sales-credit-notes/${id}`);
}

/** @param {string} id @param {{ lines: Array<Record<string, unknown>> }} body */
export function syncSalesCreditNoteLines(id, body) {
  return tenantRequest("PUT", `sales-credit-notes/${id}/lines`, body);
}

/** @param {string} id */
export function postSalesCreditNote(id) {
  return tenantRequest("POST", `sales-credit-notes/${id}/post`);
}

/** @param {string} id */
export function reverseSalesCreditNote(id) {
  return tenantRequest("POST", `sales-credit-notes/${id}/reverse`);
}

/** @param {string} id @param {{ allocations: Array<Record<string, unknown>> }} body */
export function applySalesCreditNote(id, body) {
  return tenantRequest("POST", `sales-credit-notes/${id}/apply`, body);
}

/** @param {string} salesInvoiceId */
export async function fetchSalesCreditNoteInvoiceLines(salesInvoiceId) {
  const data = await tenantRequest("GET", `sales-credit-notes/invoice-lines?sales_invoice_id=${encodeURIComponent(salesInvoiceId)}`);
  return Array.isArray(data) ? data : [];
}
