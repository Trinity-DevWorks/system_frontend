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
export async function fetchCustomerReceipts(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `customer-receipts?${qs}` : "customer-receipts");
  return parsePaginatedList(payload, params);
}

/** @param {string} id */
export function fetchCustomerReceipt(id) {
  return tenantRequest("GET", `customer-receipts/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createCustomerReceipt(body) {
  return tenantRequest("POST", "customer-receipts", body);
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 */
export function updateCustomerReceipt(id, body) {
  return tenantRequest("PUT", `customer-receipts/${id}`, body);
}

/** @param {string} id */
export function deleteCustomerReceipt(id) {
  return tenantRequest("DELETE", `customer-receipts/${id}`);
}

/**
 * @param {string} id
 * @param {{ allocations: Array<Record<string, unknown>> }} body
 */
export function syncCustomerReceiptAllocations(id, body) {
  return tenantRequest("PUT", `customer-receipts/${id}/allocations`, body);
}

/** @param {string} id */
export function postCustomerReceipt(id) {
  return tenantRequest("POST", `customer-receipts/${id}/post`);
}

/** @param {string} id */
export function reverseCustomerReceipt(id) {
  return tenantRequest("POST", `customer-receipts/${id}/reverse`);
}

/**
 * @param {{ customerId: string; currencyId: number | string }} args
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchCustomerReceiptOpenInvoices({ customerId, currencyId }) {
  const qs = toListQuery({ customer_id: customerId, currency_id: currencyId }).toString();
  const data = await tenantRequest("GET", `customer-receipts/open-invoices?${qs}`);
  return Array.isArray(data) ? data : [];
}
