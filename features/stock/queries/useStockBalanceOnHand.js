import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { isPersistedEntityId } from "@/lib/entityId";
import { fetchStockBalance } from "../api/stock.api";
import { stockBalanceShowQueryKey } from "./stockQueryKeys";
import { useQuery } from "@tanstack/react-query";

/**
 * On-hand for one item + warehouse (+ lot when lot-tracked).
 *
 * @param {{
 *   itemId?: string | null;
 *   warehouseId?: number | null;
 *   lotId?: number | string | null;
 *   trackLots?: boolean;
 *   newLot?: boolean;
 * }} args
 */
export function useStockBalanceOnHand({
  itemId = null,
  warehouseId = null,
  lotId = null,
  trackLots = false,
  newLot = false,
}) {
  const hasItem = isPersistedEntityId(itemId);
  const hasWarehouse = warehouseId != null && Number(warehouseId) > 0;
  const resolvedLotId = lotId != null && lotId !== "" ? lotId : null;
  const waitingOnLot = Boolean(trackLots) && resolvedLotId == null && !newLot;
  const enabled = hasItem && hasWarehouse && !waitingOnLot && !newLot;

  const query = useQuery({
    queryKey: stockBalanceShowQueryKey(itemId, warehouseId, resolvedLotId),
    queryFn: () =>
      fetchStockBalance(
        /** @type {string} */ (itemId),
        /** @type {number} */ (warehouseId),
        resolvedLotId,
      ),
    enabled,
    staleTime: QUERY_STALE_TIME.ledger,
  });

  const quantity = newLot
    ? 0
    : enabled && query.data != null
      ? Number(query.data.quantity ?? 0)
      : null;

  const rawCost = enabled && query.data != null ? query.data.unit_cost : null;
  const unitCost =
    rawCost == null || rawCost === ""
      ? null
      : Number(rawCost);

  return {
    quantity,
    unitCost: unitCost != null && Number.isFinite(unitCost) ? unitCost : null,
    waitingOnWarehouse: hasItem && !hasWarehouse,
    waitingOnLot,
    pending: enabled && query.isPending,
  };
}
