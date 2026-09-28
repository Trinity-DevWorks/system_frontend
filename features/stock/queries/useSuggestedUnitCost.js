import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { isPersistedEntityId } from "@/lib/entityId";
import { useQuery } from "@tanstack/react-query";
import { fetchSuggestedUnitCost } from "../api/stock.api";
import { suggestedUnitCostQueryKey } from "./stockQueryKeys";
import { isItemLineUomSentinel } from "../utils/itemLineUomOptions";

/**
 * Suggested inbound unit cost for a document line (last purchase → balance → catalog).
 *
 * @param {{
 *   itemId?: string | null;
 *   warehouseId?: number | null;
 *   supplierId?: string | null;
 *   itemUomId?: number | string | null;
 *   lotId?: number | string | null;
 *   enabled?: boolean;
 * }} args
 */
export function useSuggestedUnitCost({
  itemId = null,
  warehouseId = null,
  supplierId = null,
  itemUomId = null,
  lotId = null,
  enabled = true,
} = {}) {
  const hasItem = isPersistedEntityId(itemId);
  const hasResolvedUom = itemUomId != null && !isItemLineUomSentinel(itemUomId);
  const resolvedLotId = lotId != null && lotId !== "" ? lotId : null;
  const queryEnabled = Boolean(enabled) && hasItem && hasResolvedUom;

  const query = useQuery({
    queryKey: suggestedUnitCostQueryKey({
      itemId,
      warehouseId: warehouseId != null && Number(warehouseId) > 0 ? Number(warehouseId) : null,
      supplierId: supplierId || null,
      itemUomId: hasResolvedUom ? itemUomId : null,
      lotId: resolvedLotId,
    }),
    queryFn: () =>
      fetchSuggestedUnitCost({
        item_id: /** @type {string} */ (itemId),
        warehouse_id: warehouseId != null && Number(warehouseId) > 0 ? Number(warehouseId) : null,
        supplier_id: supplierId || null,
        item_uom_id: /** @type {number | string} */ (itemUomId),
        lot_id: resolvedLotId,
      }),
    enabled: queryEnabled,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const raw = queryEnabled && query.data != null ? query.data.unit_cost : null;
  const unitCost =
    raw == null || raw === ""
      ? null
      : Number(raw);

  return {
    unitCost: unitCost != null && Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : null,
    source: queryEnabled && query.data != null ? (query.data.source ?? null) : null,
    pending: queryEnabled && query.isPending,
  };
}
