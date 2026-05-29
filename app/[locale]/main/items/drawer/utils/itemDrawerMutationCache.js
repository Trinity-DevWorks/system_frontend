/**
 * Updates React Query list/detail cache after item create or update.
 *
 * Used by:
 * - drawer/hooks/useItemDrawerMutations.js
 */

import { ITEMS_LIST_QUERY_KEY, mergeItemListRow } from "@/components/items/itemsQueryCache";
import { refreshItemUomsAfterGeneralSave } from "@/components/items/itemUomsQueryCache";
import { sortItemsByName } from "./itemFormMappers";

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {unknown} data
 * @param {Record<string, unknown> | null} record
 */
export function applyCreatedItemToCache(queryClient, data, record) {
  const id = record?.id;
  queryClient.setQueryData(ITEMS_LIST_QUERY_KEY, (old) => {
    const base = Array.isArray(old) ? old : [];
    if (id == null) return base;
    return sortItemsByName([...base.filter((r) => r.id !== id), data]);
  });
  if (id != null) {
    queryClient.setQueryData(["tenant", "items", id], data);
    void refreshItemUomsAfterGeneralSave(queryClient, Number(id), record);
  }
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} id
 * @param {unknown} data
 * @param {Record<string, unknown> | null} record
 */
export function applyUpdatedItemToCache(queryClient, id, data, record) {
  queryClient.setQueryData(ITEMS_LIST_QUERY_KEY, (old) => {
    if (!Array.isArray(old)) return old;
    return sortItemsByName(old.map((row) => (row.id === id ? mergeItemListRow(row, data) : row)));
  });
  queryClient.setQueryData(["tenant", "items", id], (old) => mergeItemListRow(old, data));
  void refreshItemUomsAfterGeneralSave(queryClient, id, record);
}
