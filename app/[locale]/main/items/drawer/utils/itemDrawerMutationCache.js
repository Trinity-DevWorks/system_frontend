/**
 * Updates React Query list/detail cache after item create or update.
 *
 * Used by:
 * - drawer/hooks/useItemDrawerMutations.js
 */

import { ITEMS_LIST_QUERY_KEY, mergeItemListRow } from "@/components/items/itemsQueryCache";
import { refreshItemUomsAfterGeneralSave } from "@/components/items/itemUomsQueryCache";
import { normalizeEntityId } from "@/lib/entityId";
import { patchTenantListCache } from "@/lib/tables/tenantListCache";

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {unknown} data
 * @param {Record<string, unknown> | null} record
 */
export function applyCreatedItemToCache(queryClient, data, record) {
  const id = record?.id;
  if (id != null) {
    patchTenantListCache(queryClient, ITEMS_LIST_QUERY_KEY, (rows) => {
      const next = rows.filter((r) => r?.id !== id);
      return [...next, data];
    });
  }
  void queryClient.invalidateQueries({ queryKey: ITEMS_LIST_QUERY_KEY });
  const normalizedId = normalizeEntityId(id);
  if (normalizedId != null) {
    queryClient.setQueryData(["tenant", "items", normalizedId], data);
    void refreshItemUomsAfterGeneralSave(queryClient, normalizedId, record);
  }
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} id
 * @param {unknown} data
 * @param {Record<string, unknown> | null} record
 */
export function applyUpdatedItemToCache(queryClient, id, data, record) {
  patchTenantListCache(queryClient, ITEMS_LIST_QUERY_KEY, (rows) =>
    rows.map((row) => (row?.id === id ? mergeItemListRow(row, data) : row)),
  );
  queryClient.setQueryData(["tenant", "items", id], (old) => mergeItemListRow(old, data));
  void refreshItemUomsAfterGeneralSave(queryClient, id, record);
}
