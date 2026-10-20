"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import { fetchAccounts } from "../api/accounting.api";
import { accountLabel } from "../accountingUtils";
import { POSTABLE_ACCOUNTS_QUERY_KEY } from "./accountingQueryKeys";

/**
 * Active posting accounts as Select options, optionally narrowed.
 *
 * @param {{ enabled?: boolean; filter?: (account: Record<string, unknown>) => boolean }} [args]
 */
export function usePostableAccounts({ enabled = true, filter } = {}) {
  const locale = useLocale();
  const query = useQuery({
    queryKey: POSTABLE_ACCOUNTS_QUERY_KEY,
    queryFn: () => fetchAccounts({ postable: true, active: true }),
    enabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const options = useMemo(
    () =>
      (query.data ?? [])
        .filter((account) => (filter ? filter(account) : true))
        .map((account) => ({
          value: Number(account.id),
          label: accountLabel(account, locale),
          account,
        })),
    [filter, locale, query.data],
  );

  return { accounts: query.data ?? [], options, isPending: enabled && query.isPending };
}
