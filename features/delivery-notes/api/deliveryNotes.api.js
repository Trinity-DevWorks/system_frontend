import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource, fetchResourceNames } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | undefined>} [params] */
export function fetchDeliveryNotes(params = {}) {
  return fetchPaginatedResource("delivery-notes", params);
}

/** @returns {Promise<unknown[]>} */
export function fetchDeliveryNoteNames() {
  return fetchResourceNames("delivery-notes");
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function fetchDeliveryNote(id) {
  return tenantRequest("GET", `delivery-notes/${id}`);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createDeliveryNote(body) {
  return tenantRequest("POST", "delivery-notes", body);
}

/**
 * @param {number | string} id
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateDeliveryNote(id, body) {
  return tenantRequest("PUT", `delivery-notes/${id}`, body);
}

/**
 * @param {number | string} id
 * @returns {Promise<unknown>}
 */
export function deleteDeliveryNote(id) {
  return tenantRequest("DELETE", `delivery-notes/${id}`);
}

/** @param {string} id */
export function postDeliveryNote(id) {
  return tenantRequest("POST", `delivery-notes/${id}/post`);
}

/** @param {string} id */
export function reverseDeliveryNote(id) {
  return tenantRequest("POST", `delivery-notes/${id}/reverse`);
}

/**
 * Draft invoice for the delivered quantities not invoiced yet.
 * @param {string} id
 */
export function createInvoiceFromDeliveryNote(id) {
  return tenantRequest("POST", `delivery-notes/${id}/invoice`);
}

/**
 * Unsaved delivery note values for everything a sales order has not shipped yet (fills the create drawer).
 * @param {string} orderId
 * @returns {Promise<Record<string, any>>}
 */
export function fetchDeliveryTemplate(orderId) {
  return tenantRequest("GET", `sales-orders/${orderId}/delivery-template`);
}

/**
 * Confirmed orders of a customer that still have something to ship.
 * @param {string} customerId
 * @returns {Promise<Array<{ id: string; order_number: string | null; order_date: string | null }>>}
 */
export async function fetchDeliverableOrders(customerId) {
  const data = await tenantRequest("GET", `delivery-notes/deliverable-orders?customer_id=${encodeURIComponent(customerId)}`);
  return Array.isArray(data) ? data : [];
}

/** @param {string} id */
export function deliveryNotePdfUrl(id) {
  return `delivery-notes/${id}/pdf`;
}
