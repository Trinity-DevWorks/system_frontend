import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/** @param {Record<string, unknown>} [params] */
export async function fetchPurchaseDebitNotes(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `purchase-debit-notes?${qs}` : "purchase-debit-notes");
  return parsePaginatedList(payload, params);
}

/** @param {string} id */
export function fetchPurchaseDebitNote(id) {
  return tenantRequest("GET", `purchase-debit-notes/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createPurchaseDebitNote(body) {
  return tenantRequest("POST", "purchase-debit-notes", body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function updatePurchaseDebitNote(id, body) {
  return tenantRequest("PUT", `purchase-debit-notes/${id}`, body);
}

/** @param {string} id */
export function deletePurchaseDebitNote(id) {
  return tenantRequest("DELETE", `purchase-debit-notes/${id}`);
}

/** @param {string} id @param {{ lines: Array<Record<string, unknown>> }} body */
export function syncPurchaseDebitNoteLines(id, body) {
  return tenantRequest("PUT", `purchase-debit-notes/${id}/lines`, body);
}

/** @param {string} id */
export function postPurchaseDebitNote(id) {
  return tenantRequest("POST", `purchase-debit-notes/${id}/post`);
}

/** @param {string} id */
export function reversePurchaseDebitNote(id) {
  return tenantRequest("POST", `purchase-debit-notes/${id}/reverse`);
}

/** @param {string} id @param {{ allocations: Array<Record<string, unknown>> }} body */
export function applyPurchaseDebitNote(id, body) {
  return tenantRequest("POST", `purchase-debit-notes/${id}/apply`, body);
}

/** @param {string} purchaseInvoiceId */
export async function fetchPurchaseDebitNoteInvoiceLines(purchaseInvoiceId) {
  const data = await tenantRequest("GET", `purchase-debit-notes/invoice-lines?purchase_invoice_id=${encodeURIComponent(purchaseInvoiceId)}`);
  return Array.isArray(data) ? data : [];
}
