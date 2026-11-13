import { tenantRequest } from "@/lib/axios";

/** @param {Record<string, string | undefined>} [params] */
export function fetchDeferralBalances(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const suffix = query.toString() ? `?${query}` : "";
  return tenantRequest("GET", `accounting/deferral-balances${suffix}`);
}

/** @param {Record<string, string | undefined>} [params] */
export function fetchDeferralForecast(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const suffix = query.toString() ? `?${query}` : "";
  return tenantRequest("GET", `accounting/deferral-forecast${suffix}`);
}

/** @param {Record<string, string | undefined>} params */
export function exportDeferralBalances(params) {
  const query = new URLSearchParams(params);
  return tenantRequest(
    "GET",
    `accounting/deferral-balances/export?${query}`,
    undefined,
    { responseType: "blob" },
  );
}
