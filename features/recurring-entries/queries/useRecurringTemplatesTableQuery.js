"use client";

import { useTenantPaginatedTable } from "@/lib/tables/useTenantPaginatedTable";
import { fetchRecurringTemplates } from "../api/recurringTemplates.api";
import { RECURRING_TEMPLATES_LIST_QUERY_KEY } from "./recurringEntriesQueryKeys";

/** @param {{ t: (key: string) => string; tApiErrors: (key: string) => string; notification: { error: (args: unknown) => void }; extraParams?: Record<string, string | undefined> }} args */
export function useRecurringTemplatesTableQuery({ t, tApiErrors, notification, extraParams }) {
  return useTenantPaginatedTable({
    queryKey: RECURRING_TEMPLATES_LIST_QUERY_KEY,
    queryFn: fetchRecurringTemplates,
    tableId: "recurring-templates",
    extraParams,
    t,
    tApiErrors,
    notification,
  });
}
