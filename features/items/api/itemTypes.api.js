import { tenantRequest } from "@/lib/axios";

/**
 * Read-only catalog of system item types (seeded per tenant).
 * @returns {Promise<unknown[]>}
 */
export async function fetchItemTypes() {
  const data = await tenantRequest("GET", "item-types");
  return Array.isArray(data) ? data : [];
}

/**
 * @param {unknown} row
 */
export function getItemTypeLabel(row) {
  if (!row || typeof row !== "object") return "";
  const r = /** @type {{ name?: string; code?: string }} */ (row);
  return String(r.name ?? r.code ?? "").trim();
}
