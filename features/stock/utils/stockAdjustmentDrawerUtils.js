/**
 * Stock adjustment document drawer — defaults, line mapping, dirty checks, payloads.
 */

import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";
import { PO_BASE_UOM } from "./purchaseOrderDrawerUtils";
import { assignNewLotExpiry } from "./stockLotUtils";

/**
 * @typedef {{
 *   warehouse_id?: number;
 *   stock_adjustment_reason_id?: number;
 *   item_id?: string;
 *   item_label?: string;
 *   lot_id?: number;
 *   track_lots?: boolean;
 * }} AdjCreateSeed
 */

/**
 * @typedef {{
 *   item_id?: string;
 *   item_label?: string;
 *   quantity?: number;
 *   item_uom_id?: number | string | null;
 *   unit_cost?: number | null;
 *   lot_id?: number;
 *   lot_number?: string;
 *   expiry_date?: string;
 *   track_lots?: boolean;
 *   item_uom_label?: string;
 *   notes?: string;
 * }} AdjLineFormRow
 */

/**
 * @param {AdjCreateSeed | null | undefined} [seed]
 */
export function getStockAdjustmentDefaults(seed = null) {
  return {
    warehouse_id: seed?.warehouse_id != null ? Number(seed.warehouse_id) : undefined,
    stock_adjustment_reason_id:
      seed?.stock_adjustment_reason_id != null ? Number(seed.stock_adjustment_reason_id) : undefined,
    adjustment_date: dayjs(),
    notes: "",
  };
}

/**
 * @returns {AdjLineFormRow}
 */
export function getEmptyAdjLine() {
  return {
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
 * @param {AdjCreateSeed | null | undefined} [seed]
 * @returns {AdjLineFormRow}
 */
export function getSeededAdjLine(seed = null) {
  if (seed?.item_id == null || String(seed.item_id) === "") {
    return getEmptyAdjLine();
  }
  return {
    ...getEmptyAdjLine(),
    item_id: String(seed.item_id),
    item_label: typeof seed.item_label === "string" ? seed.item_label : "",
    lot_id: seed.lot_id != null ? Number(seed.lot_id) : undefined,
    track_lots: Boolean(seed.track_lots || seed.lot_id),
  };
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapAdjRecordToForm(record) {
  return {
    warehouse_id: record.warehouse_id != null ? Number(record.warehouse_id) : undefined,
    stock_adjustment_reason_id:
      record.stock_adjustment_reason_id != null ? Number(record.stock_adjustment_reason_id) : undefined,
    adjustment_date: record.adjustment_date ?? undefined,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {AdjLineFormRow[]}
 */
export function mapAdjLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    item_label: typeof line.item?.name === "string" ? line.item.name : "",
    quantity: line.quantity != null ? Number(line.quantity) : undefined,
    item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : PO_BASE_UOM,
    unit_cost: line.unit_cost != null ? Number(line.unit_cost) : undefined,
    lot_id: line.lot_id != null ? Number(line.lot_id) : undefined,
    lot_number: typeof line.lot?.lot_number === "string" ? line.lot.lot_number : "",
    expiry_date: typeof line.lot?.expiry_date === "string" ? line.lot.expiry_date : "",
    track_lots: Boolean(line.item?.track_lots),
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
 * @param {AdjLineFormRow} line
 */
export function isAdjLinePersistable(line) {
  return (
    line.item_id != null &&
    String(line.item_id) !== "" &&
    line.quantity != null &&
    Number(line.quantity) !== 0
  );
}

/**
 * @param {AdjLineFormRow} line
 */
export function isAdjLineComplete(line) {
  if (!isAdjLinePersistable(line)) return false;
  if (line.track_lots && line.lot_id == null && !String(line.lot_number ?? "").trim()) {
    return false;
  }
  return true;
}

/**
 * @param {AdjLineFormRow} line
 */
function toAdjLinePayload(line) {
  /** @type {Record<string, unknown>} */
  const row = {
    item_id: line.item_id,
    quantity: Number(line.quantity),
  };
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
 * @param {AdjLineFormRow[]} lines
 */
export function getPersistableAdjLines(lines) {
  return lines.filter(isAdjLinePersistable).map(toAdjLinePayload);
}

/**
 * @param {AdjLineFormRow[]} lines
 */
export function getValidAdjLines(lines) {
  return lines.filter(isAdjLineComplete).map(toAdjLinePayload);
}

/**
 * @param {AdjLineFormRow[]} current
 * @param {AdjLineFormRow[]} initial
 */
export function areAdjLinesDirty(current, initial) {
  return JSON.stringify(getPersistableAdjLines(current)) !== JSON.stringify(getPersistableAdjLines(initial));
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getStockAdjustmentDefaults>} baseline
 */
export function isAdjHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  if ((values.warehouse_id ?? undefined) !== (baseline.warehouse_id ?? undefined)) return true;
  if ((values.stock_adjustment_reason_id ?? undefined) !== (baseline.stock_adjustment_reason_id ?? undefined)) {
    return true;
  }
  if (String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()) return true;
  const date = values.adjustment_date;
  const dateStr = date && typeof date.format === "function" ? date.format("YYYY-MM-DD") : date;
  if ((dateStr ?? undefined) !== (baseline.adjustment_date ?? undefined)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function canSaveAdjDraft(values) {
  return values.warehouse_id != null && values.stock_adjustment_reason_id != null;
}

/**
 * @param {Record<string, unknown>} values
 */
export function adjHeaderToPayload(values) {
  const date = values.adjustment_date;
  return {
    warehouse_id: values.warehouse_id,
    stock_adjustment_reason_id: values.stock_adjustment_reason_id,
    adjustment_date:
      date && typeof date.format === "function"
        ? date.format("YYYY-MM-DD")
        : typeof date === "string" && date
          ? date
          : undefined,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
}
