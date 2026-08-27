import { tenantRequest } from "@/lib/axios";

/**
 * @param {number | string} supplierId
 * @returns {Promise<unknown[]>}
 */
export async function fetchSupplierItems(supplierId) {
  const data = await tenantRequest("GET", `suppliers/${supplierId}/supplier-items`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} itemId
 * @returns {Promise<unknown[]>}
 */
export async function fetchItemSuppliers(itemId) {
  const data = await tenantRequest("GET", `items/${itemId}/supplier-items`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} supplierId
 * @returns {Promise<unknown>}
 */
export function fetchSupplierItem(supplierId, supplierItemId) {
  return tenantRequest("GET", `suppliers/${supplierId}/supplier-items/${supplierItemId}`);
}

/**
 * @param {number | string} supplierId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSupplierItem(supplierId, body) {
  return tenantRequest("POST", `suppliers/${supplierId}/supplier-items`, body);
}

/**
 * @param {number | string} supplierId
 * @param {number | string} supplierItemId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSupplierItem(supplierId, supplierItemId, body) {
  return tenantRequest("PUT", `suppliers/${supplierId}/supplier-items/${supplierItemId}`, body);
}

/**
 * @param {number | string} supplierId
 * @param {number | string} supplierItemId
 * @returns {Promise<unknown>}
 */
export function deleteSupplierItem(supplierId, supplierItemId) {
  return tenantRequest("DELETE", `suppliers/${supplierId}/supplier-items/${supplierItemId}`);
}
