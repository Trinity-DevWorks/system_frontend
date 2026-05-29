import tenantApiService from "@/API/TenantApiService";

/**
 * @param {number | string} supplierId
 * @returns {Promise<unknown[]>}
 */
export async function fetchSupplierItems(supplierId) {
  const data = await tenantApiService("GET", `suppliers/${supplierId}/supplier-items`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} itemId
 * @returns {Promise<unknown[]>}
 */
export async function fetchItemSuppliers(itemId) {
  const data = await tenantApiService("GET", `items/${itemId}/supplier-items`);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {number | string} supplierId
 * @returns {Promise<unknown>}
 */
export function fetchSupplierItem(supplierId, supplierItemId) {
  return tenantApiService("GET", `suppliers/${supplierId}/supplier-items/${supplierItemId}`);
}

/**
 * @param {number | string} supplierId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function createSupplierItem(supplierId, body) {
  return tenantApiService("POST", `suppliers/${supplierId}/supplier-items`, body);
}

/**
 * @param {number | string} supplierId
 * @param {number | string} supplierItemId
 * @param {Record<string, unknown>} body
 * @returns {Promise<unknown>}
 */
export function updateSupplierItem(supplierId, supplierItemId, body) {
  return tenantApiService("PUT", `suppliers/${supplierId}/supplier-items/${supplierItemId}`, body);
}

/**
 * @param {number | string} supplierId
 * @param {number | string} supplierItemId
 * @returns {Promise<unknown>}
 */
export function deleteSupplierItem(supplierId, supplierItemId) {
  return tenantApiService("DELETE", `suppliers/${supplierId}/supplier-items/${supplierItemId}`);
}
