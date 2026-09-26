"use client";

import { useEffect, useRef } from "react";
import { useSuggestedUnitCost } from "../queries/useSuggestedUnitCost";

/**
 * Fills empty unit_cost from the shared suggested-cost API when the line is ready.
 *
 * @param {{
 *   itemId?: string;
 *   warehouseId?: number;
 *   supplierId?: string | null;
 *   itemUomId?: number | string;
 *   lotId?: number;
 *   unitCost?: number | null;
 *   enabled?: boolean;
 *   onApply: (unitCost: number) => void;
 * }} props
 */
export default function InboundSuggestedUnitCostSync({
  itemId,
  warehouseId,
  supplierId = null,
  itemUomId,
  lotId,
  unitCost,
  enabled = true,
  onApply,
}) {
  const suggestion = useSuggestedUnitCost({
    itemId,
    warehouseId,
    supplierId,
    itemUomId,
    lotId,
    enabled: Boolean(enabled) && Boolean(itemId),
  });
  const onApplyRef = useRef(onApply);

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  useEffect(() => {
    if (!enabled || !itemId) return;
    if (unitCost != null && unitCost !== "") return;
    if (suggestion.pending || suggestion.unitCost == null) return;
    onApplyRef.current(suggestion.unitCost);
  }, [enabled, itemId, unitCost, suggestion.pending, suggestion.unitCost]);

  return null;
}
