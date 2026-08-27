import { fetchItemWarehouseReplenishments } from "../api/itemWarehouseReplenishments.api";
import { ITEMS_LIST_QUERY_KEY } from "./itemsQueryKeys";

/**
 * @param {number} itemId
 */
export function itemWarehouseReplenishmentsQueryKey(itemId) {
  return [...ITEMS_LIST_QUERY_KEY, itemId, "warehouse-replenishments"];
}

/**
 * @param {unknown} row
 */
export function isItemWarehouseReplenishmentRow(row) {
  return Boolean(row && typeof row === "object" && "id" in row && "warehouse_id" in row);
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {unknown} saved
 */
export function setItemWarehouseReplenishmentInCache(queryClient, itemId, saved) {
  if (!isItemWarehouseReplenishmentRow(saved)) return;
  const key = itemWarehouseReplenishmentsQueryKey(itemId);
  queryClient.setQueryData(key, (prev) => {
    const list = Array.isArray(prev) ? [...prev] : [];
    const id = Number(saved.id);
    const idx = list.findIndex((r) => Number(r?.id) === id);
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    return list.sort((a, b) => Number(a.warehouse_id) - Number(b.warehouse_id));
  });
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {number} deletedId
 */
export function removeItemWarehouseReplenishmentFromCache(queryClient, itemId, deletedId) {
  const key = itemWarehouseReplenishmentsQueryKey(itemId);
  queryClient.setQueryData(key, (prev) => {
    if (!Array.isArray(prev)) return prev;
    return prev.filter((r) => Number(r?.id) !== Number(deletedId));
  });
}
