/**
 * Opening stock drawer — defaults, line mapping, dirty checks, payloads.
 */

import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";
import { PO_BASE_UOM } from "./purchaseOrderDrawerUtils";
import { assignNewLotExpiry } from "./stockLotUtils";

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
 * }} OsLineFormRow
 */

export function getOpeningStockDefaults() {
  return {
    warehouse_id: undefined,
    opening_date: dayjs(),
    notes: "",
  };
}

/**
 * @returns {OsLineFormRow}
 */
export function getEmptyOsLine() {
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
 * @param {Record<string, unknown>} record
 */
export function mapOsRecordToForm(record) {
  return {
    warehouse_id: record.warehouse_id != null ? Number(record.warehouse_id) : undefined,
    opening_date: record.opening_date ?? undefined,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {OsLineFormRow[]}
 */
export function mapOsLinesFromApi(lines) {
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
 * @param {OsLineFormRow} line
 */
export function isOsLinePersistable(line) {
  return line.item_id != null && String(line.item_id) !== "" && line.quantity != null && Number(line.quantity) > 0;
}

/**
 * @param {OsLineFormRow} line
 */
export function isOsLineComplete(line) {
  if (!isOsLinePersistable(line)) return false;
  if (line.track_lots && line.lot_id == null && !String(line.lot_number ?? "").trim()) {
    return false;
  }
  return true;
}

/**
 * @param {OsLineFormRow} line
 */
function toOsLinePayload(line) {
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
 * @param {OsLineFormRow[]} lines
 */
export function getPersistableOsLines(lines) {
  return lines.filter(isOsLinePersistable).map(toOsLinePayload);
}

/**
 * @param {OsLineFormRow[]} lines
 */
export function getValidOsLines(lines) {
  return lines.filter(isOsLineComplete).map(toOsLinePayload);
}

/**
 * @param {OsLineFormRow[]} current
 * @param {OsLineFormRow[]} initial
 */
export function areOsLinesDirty(current, initial) {
  return JSON.stringify(getPersistableOsLines(current)) !== JSON.stringify(getPersistableOsLines(initial));
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getOpeningStockDefaults>} baseline
 */
export function isOsHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  if ((values.warehouse_id ?? undefined) !== (baseline.warehouse_id ?? undefined)) return true;
  if (String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()) return true;
  const date = values.opening_date;
  const dateStr = date && typeof date.format === "function" ? date.format("YYYY-MM-DD") : date;
  if ((dateStr ?? undefined) !== (baseline.opening_date ?? undefined)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function canSaveOsDraft(values) {
  return values.warehouse_id != null;
}

/**
 * @param {Record<string, unknown>} values
 */
export function osHeaderToPayload(values) {
  const date = values.opening_date;
  return {
    warehouse_id: values.warehouse_id,
    opening_date:
      date && typeof date.format === "function"
        ? date.format("YYYY-MM-DD")
        : typeof date === "string" && date
          ? date
          : undefined,
    notes:
      typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
}
