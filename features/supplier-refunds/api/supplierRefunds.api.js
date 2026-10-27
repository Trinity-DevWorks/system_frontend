import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";
import { downloadPdf } from "@/shared/api/downloadPdf";
import { documentPdfFilename } from "@/shared/utils/documentPdf";

/** @param {Record<string, unknown>} [params] */
export async function fetchSupplierRefunds(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `supplier-refunds?${qs}` : "supplier-refunds");
  return parsePaginatedList(payload, params);
}

/** @param {string} id */
export function fetchSupplierRefund(id) {
  return tenantRequest("GET", `supplier-refunds/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createSupplierRefund(body) {
  return tenantRequest("POST", "supplier-refunds", body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function updateSupplierRefund(id, body) {
  return tenantRequest("PUT", `supplier-refunds/${id}`, body);
}

/** @param {string} id */
export function deleteSupplierRefund(id) {
  return tenantRequest("DELETE", `supplier-refunds/${id}`);
}

/** @param {string} id @param {{ allocations: Array<Record<string, unknown>> }} body */
export function syncSupplierRefundAllocations(id, body) {
  return tenantRequest("PUT", `supplier-refunds/${id}/allocations`, body);
}

/** @param {string} id */
export function postSupplierRefund(id) {
  return tenantRequest("POST", `supplier-refunds/${id}/post`);
}

/** @param {string} id */
export function reverseSupplierRefund(id) {
  return tenantRequest("POST", `supplier-refunds/${id}/reverse`);
}

/** @param {{ supplierId: string; currencyId: number | string }} args */
export async function fetchSupplierRefundOpenDebitNotes({ supplierId, currencyId }) {
  const qs = toListQuery({ supplier_id: supplierId, currency_id: currencyId }).toString();
  const data = await tenantRequest("GET", `supplier-refunds/open-debit-notes?${qs}`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} refundId
 * @param {string} [documentNumber]
 * @param {{ locale?: string }} [options]
 */
export async function downloadSupplierRefundPdf(refundId, documentNumber, options = {}) {
  await downloadPdf(`supplier-refunds/${refundId}/pdf`, documentPdfFilename(documentNumber, "supplier-refund"), options);
}
