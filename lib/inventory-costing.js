/**
 * Inventory costing method codes. Aligns with backend InventoryCostingMethod.
 */

/** @typedef {'standard' | 'fifo' | 'moving_average' | 'actual'} InventoryCostingMethod */

/** @type {readonly InventoryCostingMethod[]} */
export const INVENTORY_COSTING_METHODS = Object.freeze([
  "standard",
  "fifo",
  "moving_average",
  "actual",
]);

/**
 * @param {unknown} value
 * @returns {value is InventoryCostingMethod}
 */
export function isInventoryCostingMethod(value) {
  return INVENTORY_COSTING_METHODS.includes(/** @type {InventoryCostingMethod} */ (value));
}

/**
 * @param {(key: string) => string} t
 * @returns {{ value: InventoryCostingMethod | ''; label: string }[]}
 */
export function inventoryCostingMethodOptions(t, { includeInherit = false } = {}) {
  const methods = INVENTORY_COSTING_METHODS.map((value) => ({
    value,
    label: t(`costingMethod_${value}`),
  }));
  if (!includeInherit) return methods;
  return [{ value: "", label: t("costingMethodInherit") }, ...methods];
}
