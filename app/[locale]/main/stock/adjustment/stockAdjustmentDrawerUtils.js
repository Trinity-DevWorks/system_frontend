/**
 * Stock adjustment drawer — defaults, dirty checks, and API payload mapping.
 */

/** Select value when the adjustment uses the item's base UOM (API omits item_uom_id). */
export const STOCK_ADJUSTMENT_BASE_UOM = "__stock_adjustment_base_uom__";

export const STOCK_LOOKUP_ADD_WAREHOUSE = "__stock_add_warehouse__";
export const STOCK_LOOKUP_ADD_ITEM = "__stock_add_item__";

/**
 * @param {{ warehouse_id?: number | null; item_id?: string | null }} [seed]
 */
export function getStockAdjustmentDefaults(seed = {}) {
  return {
    warehouse_id: seed.warehouse_id ?? undefined,
    item_id: seed.item_id ?? undefined,
    item_uom_id: STOCK_ADJUSTMENT_BASE_UOM,
    quantity_delta: undefined,
    notes: "",
  };
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getStockAdjustmentDefaults>} baseline
 */
export function isStockAdjustmentDirtyVsDefaults(form, baseline) {
  const v = form.getFieldsValue(true);
  const warehouseId = v.warehouse_id ?? undefined;
  const itemId = v.item_id ?? undefined;
  const itemUomId = v.item_uom_id ?? STOCK_ADJUSTMENT_BASE_UOM;
  const quantityDelta = v.quantity_delta;
  const notes = String(v.notes ?? "").trim();

  if (warehouseId !== (baseline.warehouse_id ?? undefined)) return true;
  if (itemId !== (baseline.item_id ?? undefined)) return true;
  if (itemUomId !== (baseline.item_uom_id ?? STOCK_ADJUSTMENT_BASE_UOM)) return true;
  if (quantityDelta !== baseline.quantity_delta && quantityDelta != null) return true;
  if (notes !== String(baseline.notes ?? "").trim()) return true;

  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function stockAdjustmentRequiredFieldsValid(values) {
  const warehouseId = values.warehouse_id;
  const itemId = values.item_id;
  const quantityDelta = values.quantity_delta;

  if (warehouseId == null || itemId == null) return false;
  if (quantityDelta == null || quantityDelta === "") return false;
  if (Number(quantityDelta) === 0) return false;

  return true;
}

/**
 * @param {Record<string, unknown>} values
 * @returns {Record<string, unknown>}
 */
export function stockAdjustmentValuesToPayload(values) {
  const body = {
    warehouse_id: values.warehouse_id,
    item_id: values.item_id,
    quantity_delta: values.quantity_delta,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : undefined,
  };

  if (
    values.item_uom_id != null &&
    values.item_uom_id !== STOCK_ADJUSTMENT_BASE_UOM
  ) {
    body.item_uom_id = values.item_uom_id;
  }

  return body;
}
