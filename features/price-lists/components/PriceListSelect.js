"use client";

import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";
import { useMemo } from "react";
import { fetchPriceListNames } from "../api/priceLists.api";
import { PRICE_LISTS_LIST_QUERY_KEY } from "../queries/priceListsQueryKeys";

/**
 * Optional price list picker for customers, customer groups and branches (Form.Item child).
 *
 * @param {{ value?: unknown; onChange?: (value: unknown) => void; disabled?: boolean; placeholder?: string }} props
 */
export default function PriceListSelect({ value, onChange, disabled, placeholder }) {
  const query = useQuery({
    queryKey: [...PRICE_LISTS_LIST_QUERY_KEY, "names"],
    queryFn: () => fetchPriceListNames(),
    staleTime: QUERY_STALE_TIME.catalog,
  });

  const options = useMemo(() => {
    const rows = Array.isArray(query.data) ? query.data : [];
    return rows.map((row) => {
      const r = /** @type {Record<string, unknown>} */ (row);
      const parts = [r.code, r.name, r.currency_code ? `(${r.currency_code})` : null].filter(Boolean);
      return { value: Number(r.id), label: parts.join(" — "), disabled: r.is_active === false };
    });
  }, [query.data]);

  return (
    <Select
      allowClear
      showSearch
      optionFilterProp="label"
      value={value ?? undefined}
      onChange={(v) => onChange?.(v ?? null)}
      disabled={disabled}
      loading={query.isPending}
      options={options}
      placeholder={placeholder}
    />
  );
}
