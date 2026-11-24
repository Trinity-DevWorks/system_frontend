import { centralRequest } from "@/lib/axios";

/**
 * Platform stats: tenant/user counts, recent tenants and module adoption.
 * @returns {Promise<Record<string, unknown>>}
 */
export function fetchCentralOverview() {
  return centralRequest("GET", "overview");
}
