export const REPLENISHMENT_DRAFT_ROW_ID = "__replenishment_draft__";

/** @typedef {{
 *   warehouse_id?: number;
 *   safety_stock_qty: number;
 *   reorder_point_qty?: number;
 *   reorder_qty?: number;
 *   max_qty?: number;
 *   lead_time_days?: number;
 *   is_active: boolean;
 * }} ReplenishmentInlineValues */

/**
 * @returns {ReplenishmentInlineValues}
 */
export function defaultReplenishmentInlineValues() {
  return {
    warehouse_id: undefined,
    safety_stock_qty: 0,
    reorder_point_qty: undefined,
    reorder_qty: undefined,
    max_qty: undefined,
    lead_time_days: undefined,
    is_active: true,
  };
}

/**
 * @param {Record<string, unknown>} row
 * @returns {ReplenishmentInlineValues}
 */
export function rowToReplenishmentInlineValues(row) {
  return {
    warehouse_id: Number(row.warehouse_id ?? row.warehouse?.id) || undefined,
    safety_stock_qty: Number(row.safety_stock_qty ?? 0),
    reorder_point_qty:
      row.reorder_point_qty != null ? Number(row.reorder_point_qty) : undefined,
    reorder_qty: row.reorder_qty != null ? Number(row.reorder_qty) : undefined,
    max_qty: row.max_qty != null ? Number(row.max_qty) : undefined,
    lead_time_days: row.lead_time_days != null ? Number(row.lead_time_days) : undefined,
    is_active: row.is_active !== false,
  };
}

/**
 * @param {ReplenishmentInlineValues} values
 * @returns {Record<string, unknown>}
 */
export function replenishmentInlineValuesToBody(values) {
  return {
    warehouse_id: values.warehouse_id,
    safety_stock_qty: values.safety_stock_qty ?? 0,
    reorder_point_qty: values.reorder_point_qty,
    reorder_qty: values.reorder_qty ?? null,
    max_qty: values.max_qty ?? null,
    lead_time_days: values.lead_time_days ?? null,
    is_active: values.is_active,
  };
}
