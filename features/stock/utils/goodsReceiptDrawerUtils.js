/**
 * Goods receipt drawer — defaults, line mapping, dirty checks, payloads.
 */

import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";
import { PO_BASE_UOM } from "./purchaseOrderDrawerUtils";
import { assignNewLotExpiry } from "./stockLotUtils";

/**
 * @typedef {{
 *   purchase_order_line_id?: number;
 *   item_id?: string;
 *   item_label?: string;
 *   quantity?: number;
 *   item_uom_id?: number | string | null;
 *   unit_cost?: number | null;
 *   lot_id?: number;
 *   lot_number?: string;
 *   expiry_date?: string;
 *   track_lots?: boolean;
 *   open_quantity?: number;
 *   item_uom_label?: string;
 *   notes?: string;
 * }} GrnLineFormRow
 */

export function getGoodsReceiptDefaults() {
  return {
    purchase_order_id: undefined,
    warehouse_id: undefined,
    supplier_id: undefined,
    received_date: dayjs(),
    notes: "",
  };
}

/**
 * @returns {GrnLineFormRow}
 */
export function getEmptyGrnLine() {
  return {
    purchase_order_line_id: undefined,
    item_id: undefined,
    quantity: undefined,
    item_uom_id: PO_BASE_UOM,
    unit_cost: undefined,
    lot_id: undefined,
    lot_number: "",
    expiry_date: "",
    track_lots: false,
    notes: "",
  };
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapGrnRecordToForm(record) {
  return {
    purchase_order_id: record.purchase_order_id ?? undefined,
    warehouse_id: record.warehouse_id != null ? Number(record.warehouse_id) : undefined,
    supplier_id: record.supplier_id ?? undefined,
    received_date: record.received_date ?? undefined,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {GrnLineFormRow[]}
 */
export function mapGrnLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    purchase_order_line_id: line.purchase_order_line_id != null ? Number(line.purchase_order_line_id) : undefined,
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    item_label: formatItemOptionLabel(
      line.item && typeof line.item === "object"
        ? /** @type {{ item_code?: unknown; name?: unknown; id?: unknown }} */ (line.item)
        : { id: line.item_id },
    ),
    quantity: line.quantity != null ? Number(line.quantity) : undefined,
    item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : PO_BASE_UOM,
    unit_cost: line.unit_cost != null ? Number(line.unit_cost) : undefined,
    lot_id: line.lot_id != null ? Number(line.lot_id) : undefined,
    lot_number: typeof line.lot?.lot_number === "string" ? line.lot.lot_number : "",
    expiry_date: typeof line.lot?.expiry_date === "string" ? line.lot.expiry_date : "",
    track_lots: Boolean(line.item?.track_lots),
    open_quantity: line.open_quantity != null ? Number(line.open_quantity) : undefined,
    item_uom_label:
      typeof line.item_uom?.uom?.code === "string"
        ? line.item_uom.uom.code
        : typeof line.item_uom?.uom?.name === "string"
          ? line.item_uom.uom.name
          : "",
    notes: typeof line.notes === "string" ? line.notes : "",
  }));
}

/**
 * @param {GrnLineFormRow} line
 */
export function isGrnLinePersistable(line) {
  if (line.quantity == null || Number(line.quantity) <= 0) return false;
  if (line.purchase_order_line_id != null) return true;
  return line.item_id != null && String(line.item_id) !== "";
}

/**
 * @param {GrnLineFormRow} line
 */
export function isGrnLineComplete(line) {
  if (!isGrnLinePersistable(line)) return false;
  if (line.track_lots && line.lot_id == null && !String(line.lot_number ?? "").trim()) {
    return false;
  }
  return true;
}

/**
 * @param {GrnLineFormRow} line
 */
function toGrnLinePayload(line) {
  /** @type {Record<string, unknown>} */
  const row = {
    quantity: Number(line.quantity),
  };
  if (line.purchase_order_line_id != null) {
    row.purchase_order_line_id = Number(line.purchase_order_line_id);
  }
  if (line.item_id != null) row.item_id = line.item_id;
  if (line.item_uom_id != null && line.item_uom_id !== PO_BASE_UOM) {
    row.item_uom_id = Number(line.item_uom_id);
  }
  if (line.unit_cost != null && line.unit_cost !== "") row.unit_cost = Number(line.unit_cost);
  if (line.lot_id != null) row.lot_id = Number(line.lot_id);
  const lotNumber = String(line.lot_number ?? "").trim();
  if (lotNumber && line.lot_id == null) row.lot_number = lotNumber;
  assignNewLotExpiry(row, line);
  const notes = typeof line.notes === "string" ? line.notes.trim() : "";
  if (notes) row.notes = notes;
  return row;
}

/**
 * Draft save: keep lines even when a lot-tracked item has no lot yet.
 * @param {GrnLineFormRow[]} lines
 */
export function getPersistableGrnLines(lines) {
  return lines.filter(isGrnLinePersistable).map(toGrnLinePayload);
}

/**
 * @param {GrnLineFormRow[]} lines
 */
export function getValidGrnLines(lines) {
  return lines.filter(isGrnLineComplete).map(toGrnLinePayload);
}

/**
 * @param {GrnLineFormRow[]} current
 * @param {GrnLineFormRow[]} initial
 */
export function areGrnLinesDirty(current, initial) {
  return JSON.stringify(getPersistableGrnLines(current)) !== JSON.stringify(getPersistableGrnLines(initial));
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getGoodsReceiptDefaults>} baseline
 */
export function isGrnHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  if ((values.purchase_order_id ?? undefined) !== (baseline.purchase_order_id ?? undefined)) return true;
  if ((values.warehouse_id ?? undefined) !== (baseline.warehouse_id ?? undefined)) return true;
  if ((values.supplier_id ?? undefined) !== (baseline.supplier_id ?? undefined)) return true;
  if (String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()) return true;
  const date = values.received_date;
  const dateStr = date && typeof date.format === "function" ? date.format("YYYY-MM-DD") : date;
  const baselineDate = baseline.received_date;
  const baselineDateStr =
    baselineDate && typeof baselineDate.format === "function"
      ? baselineDate.format("YYYY-MM-DD")
      : baselineDate;
  if ((dateStr ?? undefined) !== (baselineDateStr ?? undefined)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function canSaveGrnDraft(values) {
  if (values.purchase_order_id != null) return true;
  return values.warehouse_id != null;
}

/**
 * @param {Record<string, unknown>} values
 * @param {{ standalone?: boolean }} [options]
 */
export function grnHeaderToPayload(values, options = {}) {
  const date = values.received_date;
  /** @type {Record<string, unknown>} */
  const payload = {
    received_date:
      date && typeof date.format === "function"
        ? date.format("YYYY-MM-DD")
        : typeof date === "string" && date
          ? date
          : undefined,
    notes:
      typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
  if (options.standalone) {
    payload.warehouse_id = values.warehouse_id;
    payload.supplier_id = values.supplier_id ?? null;
  }
  return payload;
}

/**
 * @param {Record<string, unknown>} values
 */
export function grnCreatePayload(values) {
  const header = grnHeaderToPayload(values);
  if (values.purchase_order_id != null) {
    return {
      purchase_order_id: values.purchase_order_id,
      ...header,
    };
  }
  return {
    warehouse_id: values.warehouse_id,
    supplier_id: values.supplier_id ?? null,
    ...header,
  };
}
