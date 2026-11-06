"use client";

import { formatTenantDate } from "@/lib/tenant-format";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchLandedCostSources, previewLandedCost } from "../api/landedCosts.api";
import { LANDED_COST_SOURCES_QUERY_KEY, LANDED_COSTS_LIST_QUERY_KEY } from "./landedCostsQueryKeys";
import { chargeKey, landedCostLinesPayload, landedCostMoney, receiptKey } from "../utils/landedCostDrawerUtils";

/**
 * Receipts and open charges to pick from, plus the live allocation preview.
 *
 * @param {{
 *   open: boolean;
 *   readOnly: boolean;
 *   landedCostId: string | null;
 *   receipts: import("../utils/landedCostDrawerUtils").LandedCostReceipt[];
 *   charges: import("../utils/landedCostDrawerUtils").LandedCostCharge[];
 *   costDate?: string | null;
 *   t: (key: string) => string;
 * }} args
 */
export function useLandedCostDrawerData({ open, readOnly, landedCostId, receipts, charges, costDate = null, t }) {
  const receiptsQuery = useQuery({
    queryKey: [...LANDED_COST_SOURCES_QUERY_KEY, "receipts"],
    queryFn: () => fetchLandedCostSources("receipts"),
    enabled: open && !readOnly,
  });
  const chargesQuery = useQuery({
    queryKey: [...LANDED_COST_SOURCES_QUERY_KEY, "charges", landedCostId],
    queryFn: () => fetchLandedCostSources("charges", { landedCostId }),
    enabled: open && !readOnly,
  });

  const receiptOptions = useMemo(() => {
    const label = (r) => [r.number, r.supplier, formatTenantDate(r.date)].filter(Boolean).join(" · ");
    const opts = (receiptsQuery.data ?? []).map((r) => ({ value: receiptKey(r), label: label(r), row: r }));
    // Keep already chosen receipts selectable even when the source list no longer offers them.
    for (const r of receipts) {
      if (!opts.some((o) => o.value === receiptKey(r))) opts.push({ value: receiptKey(r), label: label(r) || r.source_id, row: r });
    }
    return opts;
  }, [receiptsQuery.data, receipts]);

  const chargeOptions = useMemo(
    () =>
      (chargesQuery.data ?? [])
        .filter((c) => !charges.some((x) => chargeKey(x) === chargeKey(c)))
        .map((c) => ({
          value: chargeKey(c),
          label: `${c.document_number ?? ""} · ${c.label ?? ""} · ${c.party ?? ""} · ${t("openAmount")} ${landedCostMoney(c.open_amount)}`,
          row: c,
        })),
    [chargesQuery.data, charges, t],
  );

  // Live allocation preview while editing.
  const previewBody = useMemo(() => ({ cost_date: costDate, ...landedCostLinesPayload(receipts, charges) }), [costDate, receipts, charges]);
  const previewQuery = useQuery({
    queryKey: [...LANDED_COSTS_LIST_QUERY_KEY, "preview", landedCostId, JSON.stringify(previewBody)],
    queryFn: () => previewLandedCost(previewBody, landedCostId),
    enabled: open && !readOnly && receipts.length > 0 && charges.length > 0,
    retry: false,
    placeholderData: (prev) => prev,
  });

  return {
    receiptOptions,
    receiptsPending: receiptsQuery.isFetching,
    chargeOptions,
    chargesPending: chargesQuery.isFetching,
    previewQuery,
  };
}
