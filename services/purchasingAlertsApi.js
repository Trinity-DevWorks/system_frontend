import tenantApiService from "@/API/TenantApiService";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   warehouse_id?: number;
 *   item_id?: number | string;
 *   search?: string;
 *   status?: string;
 *   only_alerts?: boolean;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchPurchasingAlerts(params = {}) {
  const qs = toListQuery({
    ...params,
    only_alerts: params.only_alerts === false ? "0" : params.only_alerts === true ? "1" : undefined,
  }).toString();
  const payload = await tenantApiService(
    "GET",
    qs ? `stock/purchasing-alerts?${qs}` : "stock/purchasing-alerts",
  );
  return parsePaginatedList(payload, params);
}

/**
 * @param {number | string} replenishmentId
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchPurchasingAlert(replenishmentId) {
  return tenantApiService(
    "GET",
    `stock/purchasing-alerts/${encodeURIComponent(String(replenishmentId))}`,
  );
}

/**
 * @returns {Promise<number>}
 */
export async function fetchPurchasingAlertSummary() {
  const data = await tenantApiService("GET", "stock/purchasing-alerts/summary");
  const count = data && typeof data === "object" && "count" in data ? Number(data.count) : 0;
  return Number.isFinite(count) && count > 0 ? count : 0;
}
