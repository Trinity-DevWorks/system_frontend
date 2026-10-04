import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {string} endpoint
 * @param {Record<string, string | number | boolean | undefined | null>} [params]
 */
export async function fetchPartyLedger(endpoint, params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `${endpoint}?${qs}` : endpoint);
  const page = parsePaginatedList(payload, params);
  const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : null;
  const summaries = Array.isArray(payload?.summaries) ? payload.summaries : [];
  return { ...page, summary, summaries };
}
