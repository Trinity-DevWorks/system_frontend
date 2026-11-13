"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { fetchRecurringRuns } from "../api/recurringRuns.api";
import { RECURRING_RUNS_LIST_QUERY_KEY } from "./recurringEntriesQueryKeys";

/** @param {{ t: (key: string) => string; tApiErrors: (key: string) => string; notification: { error: (args: unknown) => void }; extraParams?: Record<string, string | undefined> }} args */
export function useRecurringRunsTableQuery({ t, tApiErrors, notification, extraParams }) {
  return useTenantPaginatedTable({
    queryKey: RECURRING_RUNS_LIST_QUERY_KEY,
    queryFn: fetchRecurringRuns,
    tableId: "recurring-runs",
    extraParams,
    t,
    tApiErrors,
    notification,
  });
}
