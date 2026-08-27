import { normalizeEntityId } from "@/lib/entityId";
import { ITEMS_LIST_QUERY_KEY } from "./itemsQueryKeys";

/** @param {string} itemId */
export function itemBundleItemsQueryKey(itemId) {
  return /** @type {const} */ ([...ITEMS_LIST_QUERY_KEY, itemId, "bundle-items"]);
}

/**
 * @param {unknown[]} rows
 * @returns {Array<{ child_item_id?: string; quantity?: number }>}
 */
export function bundleRowsToEditorLines(rows) {
  if (!rows?.length) return [{ child_item_id: undefined, quantity: undefined }];
  return rows.map((r) => ({
    child_item_id: normalizeEntityId(r.child_item_id) ?? undefined,
    quantity: Number(r.quantity),
  }));
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} itemId
 * @param {unknown[]} rows
 */
export function setBundleItemsInCache(queryClient, itemId, rows) {
  queryClient.setQueryData(itemBundleItemsQueryKey(itemId), Array.isArray(rows) ? rows : []);
}
