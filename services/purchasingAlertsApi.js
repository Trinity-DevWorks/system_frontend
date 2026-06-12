import tenantApiService from "@/API/TenantApiService";

/**
 * @param {{
 *   warehouse_id?: number;
 *   item_id?: number;
 *   search?: string;
 *   status?: string;
 *   only_alerts?: boolean;
 * }} [params]
 * @returns {Promise<unknown[]>}
 */
export async function fetchPurchasingAlerts(params = {}) {
  const query = new URLSearchParams();
  if (params.warehouse_id != null) query.set("warehouse_id", String(params.warehouse_id));
  if (params.item_id != null) query.set("item_id", String(params.item_id));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.only_alerts === false) query.set("only_alerts", "0");
  else if (params.only_alerts === true) query.set("only_alerts", "1");

  const qs = query.toString();
  const endpoint = qs ? `stock/purchasing-alerts?${qs}` : "stock/purchasing-alerts";
  const data = await tenantApiService("GET", endpoint);
  return Array.isArray(data) ? data : [];
}

/**
 * @returns {Promise<number>}
 */
export async function fetchPurchasingAlertSummary() {
  const data = await tenantApiService("GET", "stock/purchasing-alerts/summary");
  const count = data && typeof data === "object" && "count" in data ? Number(data.count) : 0;
  return Number.isFinite(count) && count > 0 ? count : 0;
}
