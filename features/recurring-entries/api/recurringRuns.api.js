import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | boolean | undefined>} [params] */
export function fetchRecurringRuns(params = {}) {
  return fetchPaginatedResource("recurring-runs", params);
}

/** @param {number | string} id */
export function retryRecurringRun(id) {
  return tenantRequest("POST", `recurring-runs/${id}/retry`);
}
