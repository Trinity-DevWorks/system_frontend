import { fetchItemUoms } from "../api/itemUoms.api";
import { ITEMS_LIST_QUERY_KEY } from "./itemsQueryKeys";

/** @param {string | number} itemId */
export function itemUomsQueryKey(itemId) {
  return /** @type {const} */ ([...ITEMS_LIST_QUERY_KEY, itemId, "item-uoms"]);
}

/**
 * @param {unknown} row
 * @returns {row is Record<string, unknown> & { id: number }}
 */
export function isItemUomRow(row) {
  return row != null && typeof row === "object" && typeof /** @type {{ id?: unknown }} */ (row).id === "number";
}

/**
 * @param {unknown[]} list
 * @param {Record<string, unknown>} row
 */
export function mergeItemUomIntoList(list, row) {
  const id = row.id;
  if (list.some((r) => r?.id === id)) {
    return list.map((r) => (r?.id === id ? { ...r, ...row } : r));
  }
  return [...list, row];
}

/**
 * @param {unknown[]} list
 * @param {number} itemUomId
 */
export function removeItemUomFromList(list, itemUomId) {
  return list.filter((row) => row?.id !== itemUomId);
}

/**
 * Mirror server exclusive flags (base / default sale / default purchase per currency).
 *
 * @param {unknown[]} list
 * @param {Record<string, unknown>} sourceRow
 */
export function applyItemUomExclusiveFlags(list, sourceRow) {
  const sourceId = sourceRow.id;
  const currencyId = sourceRow.currency?.id ?? sourceRow.currency_id;

  return list.map((row) => {
    if (!row || typeof row !== "object") return row;
    const r = /** @type {Record<string, unknown>} */ (row);

    if (r.id === sourceId) {
      return { ...r, ...sourceRow };
    }

    const next = { ...r };
    if (sourceRow.is_base) {
      next.is_base = false;
    }
    if (sourceRow.is_default_sale) {
      const rowCurrencyId = r.currency?.id ?? r.currency_id;
      if (Number(rowCurrencyId) === Number(currencyId)) {
        next.is_default_sale = false;
      }
    }
    if (sourceRow.is_default_purchase) {
      const rowCurrencyId = r.currency?.id ?? r.currency_id;
      if (Number(rowCurrencyId) === Number(currencyId)) {
        next.is_default_purchase = false;
      }
    }
    return next;
  });
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {(list: unknown[]) => unknown[]} updater
 */
export function patchItemUomsListCache(queryClient, itemId, updater) {
  queryClient.setQueryData(itemUomsQueryKey(itemId), (old) => {
    const list = Array.isArray(old) ? old : [];
    return updater(list);
  });
}

/**
 * Upsert one row from create/update/flag PATCH and apply exclusive-flag side effects.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {Record<string, unknown>} savedRow
 */
export function setItemUomInCache(queryClient, itemId, savedRow) {
  patchItemUomsListCache(queryClient, itemId, (list) =>
    applyItemUomExclusiveFlags(mergeItemUomIntoList(list, savedRow), savedRow),
  );
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {number} itemUomId
 */
export function removeItemUomFromCache(queryClient, itemId, itemUomId) {
  patchItemUomsListCache(queryClient, itemId, (list) => removeItemUomFromList(list, itemUomId));
}

/**
 * After General tab save the backend may create/update the base item-uom row.
 * Refetch so Units & pricing shows it without waiting on stale cache.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {Record<string, unknown> | null | undefined} record
 */
export async function refreshItemUomsAfterGeneralSave(queryClient, itemId, record) {
  if (itemId == null || itemId === "") return;

  const trackInventory = Boolean(record?.track_inventory);

  if (!trackInventory) {
    queryClient.setQueryData(itemUomsQueryKey(itemId), []);
    return;
  }

  await queryClient.fetchQuery({
    queryKey: itemUomsQueryKey(itemId),
    queryFn: () => fetchItemUoms(itemId),
  });
}
