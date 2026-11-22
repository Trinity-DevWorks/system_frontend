"use client";

import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { invalidateTenantListQueries } from "@/lib/tables/tenantListCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { JOURNAL_ENTRIES_QUERY_KEY } from "@/features/accounting/queries/accountingQueryKeys";
import { EXPENSE_VOUCHERS_LIST_QUERY_KEY } from "@/features/expense-vouchers/queries/expenseVouchersQueryKeys";
import {
  cancelRecurringTemplate,
  pauseRecurringTemplate,
  resumeRecurringTemplate,
  runRecurringTemplate,
  skipRecurringTemplate,
} from "../api/recurringTemplates.api";
import { retryRecurringRun } from "../api/recurringRuns.api";
import { RECURRING_RUNS_LIST_QUERY_KEY, RECURRING_TEMPLATES_LIST_QUERY_KEY, recurringTemplateDetailQueryKey } from "./recurringEntriesQueryKeys";

/** @param {{ t: (key: string) => string; tApiErrors: (key: string) => string; message: { success: (s: string) => void }; notification: { error: (args: unknown) => void } }} args */
export function useRecurringTemplateActions({ t, tApiErrors, message, notification }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    invalidateTenantListQueries(queryClient, RECURRING_TEMPLATES_LIST_QUERY_KEY);
    invalidateTenantListQueries(queryClient, RECURRING_RUNS_LIST_QUERY_KEY);
    invalidateTenantListQueries(queryClient, EXPENSE_VOUCHERS_LIST_QUERY_KEY);
    queryClient.invalidateQueries({ queryKey: JOURNAL_ENTRIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["tenant", "cash-bank-accounts"] });
  };
  return useMutation({
    mutationFn: async ({ id, action, catchUp }) => {
      if (action === "run") return runRecurringTemplate(String(id));
      if (action === "pause") return pauseRecurringTemplate(String(id));
      if (action === "resume") return resumeRecurringTemplate(String(id), { catch_up: Boolean(catchUp) });
      if (action === "skip") return skipRecurringTemplate(String(id));
      if (action === "retry") return retryRecurringRun(id);
      return cancelRecurringTemplate(String(id));
    },
    onSuccess: (_data, { id, action }) => {
      // "Run now" and "Retry" report their own result (created / failed, and why) to the caller.
      if (action !== "run" && action !== "retry") message.success(t(`${action}Success`));
      invalidate();
      if (action !== "retry" && id != null) queryClient.invalidateQueries({ queryKey: recurringTemplateDetailQueryKey(String(id)) });
      if (action === "retry") queryClient.invalidateQueries({ queryKey: RECURRING_TEMPLATES_LIST_QUERY_KEY });
    },
    onError: (err) => notification.error({ title: t("actionError"), description: getLocalizedApiErrorMessage(tApiErrors, err) }),
  });
}
