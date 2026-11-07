"use client";

import { fetchItemInvoiceLineSetup, fetchItemsForInvoice } from "@/features/items/index";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { SERVER_SEARCH_PAGE_SIZE } from "@/shared/components/selects/ServerSearchSelect";
import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";
import { useMemo } from "react";

export const SALE_ITEM_OPTIONS_QUERY_KEY = /** @type {const} */ (["tenant", "items", "sale-options"]);

/**
 * Page of sellable items for ServerSearchSelect.
 *
 * @param {{ search: string; page: number }} args
 */
export async function fetchSaleItemOptionsPage({ search, page }) {
  const result = await fetchItemsForInvoice({ context: "sale", search: search || undefined, page, per_page: SERVER_SEARCH_PAGE_SIZE });
  const rows = (result.rows ?? [])
    .map((item) => /** @type {Record<string, unknown>} */ (item))
    .filter((item) => item && item.id != null && item.allow_sale !== false)
    .map((item) => ({
      value: String(item.id),
      label: [item.item_code, item.name].filter(Boolean).join(" — ") || String(item.id),
      item_code: item.item_code,
      name: item.name,
      track_lots: item.track_lots === true,
    }));
  return { rows, total: Number(result.total) || 0 };
}

/**
 * Units of one item (loaded on demand); value is the item_uom id.
 *
 * @param {{ itemId: unknown; value?: unknown; onChange?: (v: unknown) => void; disabled?: boolean; placeholder?: string }} props
 */
export function ItemUomSelect({ itemId, value, onChange, disabled, placeholder }) {
  const enabled = itemId != null && itemId !== "";
  const query = useQuery({
    queryKey: ["tenant", "items", String(itemId ?? ""), "invoice-line-setup"],
    queryFn: () => fetchItemInvoiceLineSetup(/** @type {string} */ (itemId)),
    enabled,
    staleTime: QUERY_STALE_TIME.catalog,
  });
  const options = useMemo(() => {
    const uoms = Array.isArray(query.data?.item_uoms) ? query.data.item_uoms : [];
    return uoms.map((u) => {
      const row = /** @type {Record<string, any>} */ (u);
      return { value: Number(row.id), label: row.uom?.name ?? row.uom?.code ?? String(row.id) };
    });
  }, [query.data]);

  return (
    <Select
      value={value ?? undefined}
      onChange={onChange}
      disabled={disabled || !enabled}
      loading={query.isFetching}
      options={options}
      placeholder={placeholder}
      className="w-full"
    />
  );
}

/**
 * Default sale unit (and its catalog price) for a freshly picked item.
 *
 * @param {string} itemId
 * @returns {Promise<{ item_uom_id: number; selling_price: number | null } | null>}
 */
export async function defaultSaleUom(itemId) {
  const setup = await fetchItemInvoiceLineSetup(itemId);
  const uoms = Array.isArray(setup?.item_uoms) ? setup.item_uoms : [];
  const pick = uoms.find((u) => u.is_default_sale) ?? uoms.find((u) => u.is_base) ?? uoms[0];
  if (!pick) return null;
  return { item_uom_id: Number(pick.id), selling_price: pick.selling_price != null ? Number(pick.selling_price) : null };
}
