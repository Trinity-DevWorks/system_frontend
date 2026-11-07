import { tenantRequest } from "@/lib/axios";
import { fetchItemAttributeNames } from "@/features/item-attributes/api/itemAttributes.api";
import { ITEM_ATTRIBUTES_LIST_QUERY_KEY } from "@/features/item-attributes/queries/itemAttributesQueryKeys";

/** Same key as the attributes page, so edits there refresh the variant picker. */
export const ITEM_ATTRIBUTES_QUERY_KEY = ITEM_ATTRIBUTES_LIST_QUERY_KEY;
export const ITEM_VARIANTS_QUERY_KEY = /** @type {const} */ (["tenant", "item-variants"]);

/** @returns {Promise<Array<Record<string, any>>>} */
export function fetchItemAttributes() {
  return /** @type {Promise<Array<Record<string, any>>>} */ (fetchItemAttributeNames());
}

/**
 * @param {string} itemId
 * @returns {Promise<{ attributes: Array<Record<string, any>>; variants: Array<Record<string, any>> }>}
 */
export async function fetchItemVariants(itemId) {
  const data = await tenantRequest("GET", `items/${itemId}/variants`);
  return {
    attributes: Array.isArray(data?.attributes) ? data.attributes : [],
    variants: Array.isArray(data?.variants) ? data.variants : [],
  };
}

/**
 * @param {string} itemId
 * @param {Array<{ attribute_id: number; value_ids: number[] }>} attributes
 */
export function generateItemVariants(itemId, attributes) {
  return tenantRequest("POST", `items/${itemId}/variants/generate`, { attributes });
}
