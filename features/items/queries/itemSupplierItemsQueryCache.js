import { ITEMS_LIST_QUERY_KEY } from "./itemsQueryKeys";
/** @param {number} itemId */
export function itemSupplierItemsQueryKey(itemId) {
  return /** @type {const} */ ([...ITEMS_LIST_QUERY_KEY, itemId, "supplier-items"]);
}

/**
 * @param {unknown} row
 * @returns {row is Record<string, unknown> & { id: number }}
 */
export function isSupplierItemRow(row) {
  return row != null && typeof row === "object" && typeof /** @type {{ id?: unknown }} */ (row).id === "number";
}

/**
 * @param {unknown[]} list
 * @param {Record<string, unknown>} row
 */
function mergeRowIntoList(list, row) {
  const id = row.id;
  if (list.some((r) => r?.id === id)) {
    return list.map((r) => (r?.id === id ? { ...r, ...row } : r));
  }
  return [...list, row];
}

/**
 * @param {unknown[]} list
 * @param {Record<string, unknown>} sourceRow
 */
function applyPreferredExclusiveFlag(list, sourceRow) {
  const sourceId = sourceRow.id;

  return list.map((row) => {
    if (!row || typeof row !== "object") return row;
    const r = /** @type {Record<string, unknown>} */ (row);

    if (r.id === sourceId) {
      return { ...r, ...sourceRow };
    }

    if (sourceRow.is_preferred) {
      return { ...r, is_preferred: false };
    }
    return r;
  });
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {(list: unknown[]) => unknown[]} updater
 */
export function patchItemSupplierItemsListCache(queryClient, itemId, updater) {
  queryClient.setQueryData(itemSupplierItemsQueryKey(itemId), (old) => {
    const list = Array.isArray(old) ? old : [];
    return updater(list);
  });
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {Record<string, unknown>} savedRow
 */
export function setSupplierItemInCache(queryClient, itemId, savedRow) {
  patchItemSupplierItemsListCache(queryClient, itemId, (list) =>
    applyPreferredExclusiveFlag(mergeRowIntoList(list, savedRow), savedRow),
  );
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {number} supplierItemId
 */
export function removeSupplierItemFromCache(queryClient, itemId, supplierItemId) {
  patchItemSupplierItemsListCache(queryClient, itemId, (list) =>
    list.filter((row) => row?.id !== supplierItemId),
  );
}
