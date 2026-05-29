import tenantApiService from "@/API/TenantApiService";

/**
 * List components for a bundle item (item must have type BUNDLE).
 * @param {number | string} bundleItemId
 * @returns {Promise<unknown[]>}
 */
export async function fetchBundleItems(bundleItemId) {
  const data = await tenantApiService("GET", `items/${bundleItemId}/bundle-items`);
  return Array.isArray(data) ? data : [];
}

/**
 * Replace all bundle components in one request.
 * @param {number | string} bundleItemId
 * @param {{ components: Array<{ child_item_id: number; quantity: number }> }} body
 * @returns {Promise<unknown[]>}
 */
export async function syncBundleItems(bundleItemId, body) {
  const data = await tenantApiService("PUT", `items/${bundleItemId}/bundle-items/sync`, body);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} bundleItemId
 * @param {{ child_item_id: number; quantity: number }} body
 * @returns {Promise<unknown>}
 */
export function addBundleItem(bundleItemId, body) {
  return tenantApiService("POST", `items/${bundleItemId}/bundle-items`, body);
}

/**
 * @param {number | string} bundleItemId
 * @param {number | string} bundleItemRowId
 * @param {{ quantity: number }} body
 * @returns {Promise<unknown>}
 */
export function updateBundleItem(bundleItemId, bundleItemRowId, body) {
  return tenantApiService("PUT", `items/${bundleItemId}/bundle-items/${bundleItemRowId}`, body);
}

/**
 * @param {number | string} bundleItemId
 * @param {number | string} bundleItemRowId
 * @returns {Promise<unknown>}
 */
export function deleteBundleItem(bundleItemId, bundleItemRowId) {
  return tenantApiService("DELETE", `items/${bundleItemId}/bundle-items/${bundleItemRowId}`);
}
