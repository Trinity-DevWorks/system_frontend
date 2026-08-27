import { normalizeEntityId } from "@/lib/entityId";
import { ITEMS_LIST_QUERY_KEY } from "./itemsQueryKeys";

/** @param {string} itemId */
export function itemRecipeQueryKey(itemId) {
  return /** @type {const} */ ([...ITEMS_LIST_QUERY_KEY, itemId, "recipe"]);
}

/** @param {string} itemId */
export function itemRecipeItemsQueryKey(itemId) {
  return /** @type {const} */ ([...ITEMS_LIST_QUERY_KEY, itemId, "recipe-items"]);
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isRecipeHeader(value) {
  return value != null && typeof value === "object" && "yield_quantity" in value;
}

/**
 * @param {unknown[]} rows
 * @returns {Array<{ item_id?: string; quantity?: number; uom_id?: number }>}
 */
export function recipeRowsToEditorLines(rows) {
  if (!rows?.length) return [{ item_id: undefined, quantity: undefined, uom_id: undefined }];
  return rows.map((r) => ({
    item_id: normalizeEntityId(r.item_id) ?? undefined,
    quantity: Number(r.quantity),
    uom_id: Number(r.uom_id),
  }));
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} itemId
 * @param {Record<string, unknown>} recipe
 */
export function setRecipeHeaderInCache(queryClient, itemId, recipe) {
  const { ingredients: _ingredients, ...header } = recipe;
  queryClient.setQueryData(itemRecipeQueryKey(itemId), header);
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} itemId
 * @param {unknown[]} rows
 */
export function setRecipeItemsInCache(queryClient, itemId, rows) {
  queryClient.setQueryData(itemRecipeItemsQueryKey(itemId), Array.isArray(rows) ? rows : []);
}
