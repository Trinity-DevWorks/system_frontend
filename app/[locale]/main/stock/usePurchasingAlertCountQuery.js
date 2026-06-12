/**
 * Lightweight purchasing alert count for Stock module tab badge.
 *
 * Used by:
 * - app/[locale]/main/stock/StockModuleTabs.js
 */

import { PURCHASING_ALERTS_SUMMARY_QUERY_KEY } from "@/components/stock/stockQueryCache";
import { fetchPurchasingAlertSummary } from "@/services/purchasingAlertsApi";
import { useQuery } from "@tanstack/react-query";

export function usePurchasingAlertCountQuery() {
  const { data: count = 0 } = useQuery({
    queryKey: PURCHASING_ALERTS_SUMMARY_QUERY_KEY,
    queryFn: fetchPurchasingAlertSummary,
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return count;
}
