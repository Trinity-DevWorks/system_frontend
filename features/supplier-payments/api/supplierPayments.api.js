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
export async function fetchSupplierPayments(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `supplier-payments?${qs}` : "supplier-payments");
  return parsePaginatedList(payload, params);
}

/** @param {string} id */
export function fetchSupplierPayment(id) {
  return tenantRequest("GET", `supplier-payments/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createSupplierPayment(body) {
  return tenantRequest("POST", "supplier-payments", body);
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 */
export function updateSupplierPayment(id, body) {
  return tenantRequest("PUT", `supplier-payments/${id}`, body);
}

/** @param {string} id */
export function deleteSupplierPayment(id) {
  return tenantRequest("DELETE", `supplier-payments/${id}`);
}

/**
 * @param {string} id
 * @param {{ allocations: Array<Record<string, unknown>> }} body
 */
export function syncSupplierPaymentAllocations(id, body) {
  return tenantRequest("PUT", `supplier-payments/${id}/allocations`, body);
}

/** @param {string} id */
export function postSupplierPayment(id) {
  return tenantRequest("POST", `supplier-payments/${id}/post`);
}

/** @param {string} id */
export function reverseSupplierPayment(id) {
  return tenantRequest("POST", `supplier-payments/${id}/reverse`);
}

/**
 * @param {{ supplierId: string; currencyId: number | string }} args
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchSupplierPaymentOpenInvoices({ supplierId, currencyId }) {
  const qs = toListQuery({ supplier_id: supplierId, currency_id: currencyId }).toString();
  const data = await tenantRequest("GET", `supplier-payments/open-invoices?${qs}`);
  return Array.isArray(data) ? data : [];
}
