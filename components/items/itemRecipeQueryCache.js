/** @param {number} itemId */
export function itemRecipeQueryKey(itemId) {
  return /** @type {const} */ (["tenant", "items", itemId, "recipe"]);
}

/** @param {number} itemId */
export function itemRecipeItemsQueryKey(itemId) {
  return /** @type {const} */ (["tenant", "items", itemId, "recipe-items"]);
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
 * @returns {Array<{ item_id?: number; quantity?: number; uom_id?: number }>}
 */
export function recipeRowsToEditorLines(rows) {
  if (!rows?.length) return [{ item_id: undefined, quantity: undefined, uom_id: undefined }];
  return rows.map((r) => ({
    item_id: Number(r.item_id),
    quantity: Number(r.quantity),
    uom_id: Number(r.uom_id),
  }));
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {Record<string, unknown>} recipe
 */
export function setRecipeHeaderInCache(queryClient, itemId, recipe) {
  const { ingredients: _ingredients, ...header } = recipe;
  queryClient.setQueryData(itemRecipeQueryKey(itemId), header);
}

/**
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {number} itemId
 * @param {unknown[]} rows
 */
export function setRecipeItemsInCache(queryClient, itemId, rows) {
  queryClient.setQueryData(itemRecipeItemsQueryKey(itemId), Array.isArray(rows) ? rows : []);
}
