import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { isPersistedEntityId } from "@/lib/entityId";
import { fetchStockRevaluationBalanceHint } from "../api/stockRevaluations.api";
import { stockRevaluationBalanceHintQueryKey } from "./stockQueryKeys";
import { useQuery } from "@tanstack/react-query";

/**
 * Balance hint (qty + current unit cost) for a revaluation line.
 *
 * @param {{
 *   itemId?: string | null;
 *   warehouseId?: number | null;
 *   lotId?: number | string | null;
 *   trackLots?: boolean;
 *   enabled?: boolean;
 * }} args
 */
export function useStockRevaluationBalanceHint({
  itemId = null,
  warehouseId = null,
  lotId = null,
  trackLots = false,
  enabled = true,
}) {
  const hasItem = isPersistedEntityId(itemId);
  const hasWarehouse = warehouseId != null && Number(warehouseId) > 0;
  const resolvedLotId = lotId != null && lotId !== "" ? Number(lotId) : null;
  const waitingOnLot = Boolean(trackLots) && resolvedLotId == null;
  const queryEnabled = Boolean(enabled) && hasItem && hasWarehouse && !waitingOnLot;

  const query = useQuery({
    queryKey: stockRevaluationBalanceHintQueryKey(warehouseId, itemId, resolvedLotId),
    queryFn: () =>
      fetchStockRevaluationBalanceHint({
        warehouse_id: /** @type {number} */ (warehouseId),
        item_id: /** @type {string} */ (itemId),
        lot_id: resolvedLotId,
      }),
    enabled: queryEnabled,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const quantity =
    queryEnabled && query.data != null ? Number(query.data.quantity ?? 0) : null;
  const rawCost = queryEnabled && query.data != null ? query.data.unit_cost : null;
  const unitCost =
    rawCost == null || rawCost === ""
      ? null
      : Number(rawCost);

  return {
    quantity: quantity != null && Number.isFinite(quantity) ? quantity : null,
    unitCost: unitCost != null && Number.isFinite(unitCost) ? unitCost : null,
    waitingOnWarehouse: hasItem && !hasWarehouse,
    waitingOnLot,
    pending: queryEnabled && query.isPending,
    isSuccess: queryEnabled && query.isSuccess,
  };
}
