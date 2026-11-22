import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

export const SERIAL_STATUSES = ["in_stock", "in_transit", "sold", "returned_to_supplier", "consumed", "scrapped", "void"];

/** @type {Record<string, string>} */
export const SERIAL_STATUS_COLORS = {
  in_stock: "green",
  in_transit: "blue",
  sold: "purple",
  returned_to_supplier: "orange",
  consumed: "default",
  scrapped: "red",
  void: "default",
};

/** @param {number | string} id */
export const serialQueryKey = (id) => ["tenant", "stock-serial", String(id)];

/**
 * @param {{
 *   search?: string;
 *   item_id?: string;
 *   warehouse_id?: number;
 *   status?: string;
 *   customer_id?: string;
 *   supplier_id?: string;
 *   warranty?: "active" | "expired";
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchSerials(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `stock/serials?${qs}` : "stock/serials");
  return parsePaginatedList(payload, params);
}

/**
 * In-stock serials of an item in a warehouse (picker for outbound lines).
 *
 * @param {{ itemId: string; warehouseId: number | string; search?: string }} params
 * @returns {Promise<{ id: number; serial_number: string }[]>}
 */
export async function fetchAvailableSerials({ itemId, warehouseId, search }) {
  const query = new URLSearchParams({ item_id: String(itemId), warehouse_id: String(warehouseId) });
  if (search) query.set("search", search);
  const payload = await tenantRequest("GET", `stock/serials/available?${query.toString()}`);
  return Array.isArray(payload) ? payload : [];
}

/** @param {number | string} id */
export function fetchSerial(id) {
  return tenantRequest("GET", `stock/serials/${encodeURIComponent(String(id))}`);
}

/**
 * @param {number | string} id
 * @param {{ notes?: string | null; warranty_ends_on?: string | null }} body
 */
export function updateSerial(id, body) {
  return tenantRequest("PUT", `stock/serials/${encodeURIComponent(String(id))}`, body);
}
