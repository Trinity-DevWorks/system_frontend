import { tenantRequest } from "@/lib/axios";

/**
 * @param {number | string} itemId
 * @returns {Promise<unknown>}
 */
export async function fetchRecipe(itemId) {
  try {
    return await tenantRequest("GET", `items/${itemId}/recipe`);
  } catch (err) {
    if (/** @type {{ response?: { status?: number } }} */ (err)?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Create or update recipe header (yield + UOM) for a produce item.
 * @param {number | string} itemId
 * @param {{ yield_quantity: number; uom_id: number }} body
 * @returns {Promise<unknown>}
 */
export function upsertRecipe(itemId, body) {
  return tenantRequest("PUT", `items/${itemId}/recipe`, body);
}

/**
 * @param {number | string} itemId
 * @returns {Promise<unknown[]>}
 */
export async function fetchRecipeItems(itemId) {
  const data = await tenantRequest("GET", `items/${itemId}/recipe-items`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} itemId
 * @param {{ item_id: number; quantity: number; uom_id: number }} body
 * @returns {Promise<unknown>}
 */
export function addRecipeItem(itemId, body) {
  return tenantRequest("POST", `items/${itemId}/recipe-items`, body);
}

/**
 * Replace all recipe ingredients in one request.
 * @param {number | string} itemId
 * @param {{ ingredients: Array<{ item_id: number; quantity: number; uom_id: number }> }} body
 * @returns {Promise<unknown[]>}
 */
export async function syncRecipeItems(itemId, body) {
  const data = await tenantRequest("PUT", `items/${itemId}/recipe-items/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} itemId
 * @param {number | string} recipeItemId
 * @param {{ quantity: number; uom_id: number }} body
 * @returns {Promise<unknown>}
 */
export function updateRecipeItem(itemId, recipeItemId, body) {
  return tenantRequest("PUT", `items/${itemId}/recipe-items/${recipeItemId}`, body);
}

/**
 * @param {number | string} itemId
 * @param {number | string} recipeItemId
 * @returns {Promise<unknown>}
 */
export function deleteRecipeItem(itemId, recipeItemId) {
  return tenantRequest("DELETE", `items/${itemId}/recipe-items/${recipeItemId}`);
}
