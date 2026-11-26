"use client";

import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { tenantRequest } from "@/lib/axios";
import { tenantPricesIncludeTax } from "@/lib/company-settings";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";

/**
 * Do this sales document's prices include VAT?
 * A saved document keeps the mode it got when it was created. A new one gets its main price list's mode
 * (customer → group → branch → default list), else the company setting — asked from the server while the
 * customer, currency or date changes.
 *
 * @param {{
 *   record?: Record<string, any> | null;
 *   customerId?: unknown;
 *   currencyId?: unknown;
 *   date?: unknown;
 *   settings: Record<string, any>;
 * }} args
 * @returns {boolean}
 */
export function useDocumentTaxMode({ record, customerId, currencyId, date, settings }) {
  const stored = typeof record?.prices_include_tax === "boolean" ? record.prices_include_tax : null;
  const day = date ? dayjs(/** @type {any} */ (date)) : null;
  const dateString = day && day.isValid() ? day.format("YYYY-MM-DD") : null;
  const query = useQuery({
    queryKey: ["pricing", "tax-mode", customerId ?? null, currencyId ?? null, dateString],
    queryFn: () =>
      tenantRequest("GET", "pricing/tax-mode", undefined, {
        params: {
          customer_id: customerId ? String(customerId) : undefined,
          currency_id: currencyId != null && currencyId !== "" ? Number(currencyId) : undefined,
          date: dateString ?? undefined,
        },
      }),
    enabled: stored === null,
    staleTime: QUERY_STALE_TIME.default,
  });
  const taxOn = Boolean(settings?.taxEnabled);
  if (stored !== null) return taxOn && stored;
  const fetched = /** @type {any} */ (query.data)?.prices_include_tax;
  return typeof fetched === "boolean" ? taxOn && fetched : tenantPricesIncludeTax(settings);
}
