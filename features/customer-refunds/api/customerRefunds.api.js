import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/** @param {Record<string, unknown>} [params] */
export async function fetchCustomerRefunds(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `customer-refunds?${qs}` : "customer-refunds");
  return parsePaginatedList(payload, params);
}

/** @param {string} id */
export function fetchCustomerRefund(id) {
  return tenantRequest("GET", `customer-refunds/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createCustomerRefund(body) {
  return tenantRequest("POST", "customer-refunds", body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function updateCustomerRefund(id, body) {
  return tenantRequest("PUT", `customer-refunds/${id}`, body);
}

/** @param {string} id */
export function deleteCustomerRefund(id) {
  return tenantRequest("DELETE", `customer-refunds/${id}`);
}

/** @param {string} id @param {{ allocations: Array<Record<string, unknown>> }} body */
export function syncCustomerRefundAllocations(id, body) {
  return tenantRequest("PUT", `customer-refunds/${id}/allocations`, body);
}

/** @param {string} id */
export function postCustomerRefund(id) {
  return tenantRequest("POST", `customer-refunds/${id}/post`);
}

/** @param {string} id */
export function reverseCustomerRefund(id) {
  return tenantRequest("POST", `customer-refunds/${id}/reverse`);
}

/** @param {{ customerId: string; currencyId: number | string }} args */
export async function fetchCustomerRefundOpenCreditNotes({ customerId, currencyId }) {
  const qs = toListQuery({ customer_id: customerId, currency_id: currencyId }).toString();
  const data = await tenantRequest("GET", `customer-refunds/open-credit-notes?${qs}`);
  return Array.isArray(data) ? data : [];
}
