/*
 * Plain helper functions and small constants for the delivery note drawer (no React).
 */

import dayjs from "dayjs";

export const DELIVERY_NOTE_CREATE_SAVE_INTENT_KEY = "deliveryNoteDrawer:createSaveIntent";
export const DELIVERY_NOTE_CREATE_SAVE_INTENT_EVENT = "deliveryNoteDrawer:createSaveIntent:change";

/** @param {unknown} value */
function dateString(value) {
  if (!value) return null;
  const d = dayjs(/** @type {any} */ (value));
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
}

/** @param {unknown} value */
function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** @param {Record<string, any>} v */
function snapshot(v) {
  const lines = Array.isArray(v?.lines) ? v.lines : [];
  return JSON.stringify([
    v?.customer_id ?? null,
    numberOrNull(v?.warehouse_id),
    dateString(v?.delivery_date),
    String(v?.notes ?? "").trim(),
    lines.map((l) => [
      l?.item_id ?? null,
      numberOrNull(l?.item_uom_id),
      numberOrNull(l?.quantity),
      numberOrNull(l?.lot_id),
      numberOrNull(l?.sales_order_line_id),
    ]),
  ]);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} defaults
 */
export function isCreateDirtyVsDefaults(form, defaults) {
  return snapshot(form.getFieldsValue(true)) !== snapshot(defaults);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} row
 */
export function isEditDirtyVsLoaded(form, row) {
  return snapshot(form.getFieldsValue(true)) !== snapshot(recordToFormValues(row));
}

/**
 * @param {unknown} customerId
 * @param {unknown} warehouseId
 * @param {unknown} lines
 */
export function requiredFieldsValid(customerId, warehouseId, lines) {
  if (!customerId || warehouseId == null || warehouseId === "") return false;
  const rows = Array.isArray(lines) ? lines : [];
  return rows.some((l) => l && l.item_id && Number(l.quantity) > 0);
}

/** @param {Record<string, unknown>} row */
export function toDeliveryNoteCacheRow(row) {
  return { ...row };
}

/** @param {Record<string, any>} r */
export function recordToFormValues(r) {
  const lines = Array.isArray(r.lines) ? r.lines : [];
  return {
    customer_id: r.customer_id ?? undefined,
    customer_label: r.customer?.name ?? null,
    warehouse_id: r.warehouse_id ?? undefined,
    delivery_date: r.delivery_date ? dayjs(String(r.delivery_date)) : dayjs(),
    sales_order_id: r.sales_order_id ?? null,
    sales_order_label: r.sales_order?.order_number ?? null,
    status: r.status ?? "draft",
    notes: r.notes ?? "",
    lines: lines.map((l) => ({
      sales_order_line_id: l.sales_order_line_id ?? null,
      item_id: l.item_id ?? null,
      item_label: l.item ? [l.item.item_code, l.item.name].filter(Boolean).join(" — ") : null,
      track_lots: l.item?.track_lots === true,
      item_uom_id: l.item_uom_id ?? null,
      lot_id: l.lot_id ?? null,
      quantity: numberOrNull(l.quantity),
      description: l.description ?? "",
    })),
  };
}

/** Newest first. @param {unknown[]} list */
export function sortDeliveryNotesByName(list) {
  return [...list].sort((a, b) =>
    String(/** @type {{ delivery_date?: string }} */ (b).delivery_date ?? "").localeCompare(
      String(/** @type {{ delivery_date?: string }} */ (a).delivery_date ?? ""),
    ),
  );
}

/** @param {Record<string, any>} values */
export function deliveryNoteFormValuesToPayload(values) {
  const lines = Array.isArray(values.lines) ? values.lines : [];
  return {
    customer_id: values.customer_id ?? null,
    warehouse_id: numberOrNull(values.warehouse_id),
    delivery_date: dateString(values.delivery_date),
    sales_order_id: values.sales_order_id ?? null,
    notes: String(values.notes ?? "").trim() || null,
    lines: lines
      .filter((l) => l && l.item_id && numberOrNull(l.quantity) != null)
      .map((l) => ({
        sales_order_line_id: numberOrNull(l.sales_order_line_id),
        item_id: String(l.item_id),
        item_uom_id: numberOrNull(l.item_uom_id),
        lot_id: numberOrNull(l.lot_id),
        quantity: numberOrNull(l.quantity),
        description: String(l.description ?? "").trim() || null,
      })),
  };
}
