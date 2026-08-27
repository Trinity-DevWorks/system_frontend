/**
 * Stock count drawer — defaults, line mapping, dirty checks, payloads.
 */

import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";
import { assignNewLotExpiry } from "./stockLotUtils";

/**
 * @typedef {{
 *   item_id?: string;
 *   item_label?: string;
 *   theoretical_quantity?: number;
 *   counted_quantity?: number;
 *   unit_cost?: number | null;
 *   lot_id?: number;
 *   lot_number?: string;
 *   expiry_date?: string;
 *   track_lots?: boolean;
 *   item_uom_label?: string;
 *   notes?: string;
 * }} CntLineFormRow
 */

/**
 * @param {unknown} item
 */
function cntUomLabel(item) {
  const uom = item?.base_uom;
  return typeof uom?.code === "string" ? uom.code : typeof uom?.name === "string" ? uom.name : "";
}

export function getStockCountDefaults() {
  return {
    warehouse_id: undefined,
    count_date: dayjs(),
    notes: "",
  };
}

/**
 * @returns {CntLineFormRow}
 */
export function getEmptyCntLine() {
  return {
    item_id: undefined,
    theoretical_quantity: undefined,
    counted_quantity: undefined,
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
export function mapCntRecordToForm(record) {
  return {
    warehouse_id: record.warehouse_id != null ? Number(record.warehouse_id) : undefined,
    count_date: record.count_date ?? undefined,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {CntLineFormRow[]}
 */
export function mapCntLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    item_label: typeof line.item?.name === "string" ? line.item.name : "",
    theoretical_quantity: line.theoretical_quantity != null ? Number(line.theoretical_quantity) : undefined,
    counted_quantity: line.counted_quantity != null ? Number(line.counted_quantity) : undefined,
    unit_cost: line.unit_cost != null ? Number(line.unit_cost) : undefined,
    lot_id: line.lot_id != null ? Number(line.lot_id) : undefined,
    lot_number: typeof line.lot?.lot_number === "string" ? line.lot.lot_number : "",
    expiry_date: typeof line.lot?.expiry_date === "string" ? line.lot.expiry_date : "",
    track_lots: Boolean(line.item?.track_lots),
    item_uom_label: cntUomLabel(line.item),
    notes: typeof line.notes === "string" ? line.notes : "",
  }));
}

/**
 * @param {CntLineFormRow} line
 */
export function cntLineVariance(line) {
  if (line.counted_quantity == null || line.theoretical_quantity == null) return undefined;
  const counted = Number(line.counted_quantity);
  const theoretical = Number(line.theoretical_quantity);
  if (!Number.isFinite(counted) || !Number.isFinite(theoretical)) return undefined;
  return counted - theoretical;
}

/**
 * @param {CntLineFormRow} line
 */
export function isCntSurplusLine(line) {
  const counted = Number(line.counted_quantity);
  if (!Number.isFinite(counted)) return false;
  const theoretical = line.theoretical_quantity == null ? 0 : Number(line.theoretical_quantity);
  return counted > theoretical;
}

/**
 * @param {CntLineFormRow} line
 */
export function canCntCreateLot(line) {
  if (!line.track_lots || line.lot_id != null) return false;
  if (line.theoretical_quantity == null || Number(line.theoretical_quantity) === 0) return true;
  return isCntSurplusLine(line);
}

/**
 * @param {CntLineFormRow} line
 */
export function isCntLinePersistable(line) {
  return (
    line.item_id != null &&
    String(line.item_id) !== "" &&
    line.counted_quantity != null &&
    Number(line.counted_quantity) >= 0
  );
}

/**
 * @param {CntLineFormRow} line
 */
export function isCntLineComplete(line) {
  if (!isCntLinePersistable(line)) return false;
  if (line.track_lots && line.lot_id == null && !String(line.lot_number ?? "").trim()) {
    return false;
  }
  return true;
}

/**
 * @param {CntLineFormRow} line
 */
function toCntLinePayload(line) {
  /** @type {Record<string, unknown>} */
  const row = {
    item_id: line.item_id,
    counted_quantity: Number(line.counted_quantity),
  };
  if (line.theoretical_quantity != null && line.theoretical_quantity !== "") {
    row.theoretical_quantity = Number(line.theoretical_quantity);
  }
  if (isCntSurplusLine(line) && line.unit_cost != null && line.unit_cost !== "") {
    row.unit_cost = Number(line.unit_cost);
  }
  if (line.lot_id != null) row.lot_id = Number(line.lot_id);
  const lotNumber = String(line.lot_number ?? "").trim();
  if (lotNumber && line.lot_id == null && canCntCreateLot(line)) {
    row.lot_number = lotNumber;
    assignNewLotExpiry(row, line);
  }
  const notes = typeof line.notes === "string" ? line.notes.trim() : "";
  if (notes) row.notes = notes;
  return row;
}

/**
 * @param {CntLineFormRow[]} lines
 */
export function getPersistableCntLines(lines) {
  return lines.filter(isCntLinePersistable).map(toCntLinePayload);
}

/**
 * @param {CntLineFormRow[]} lines
 */
export function getValidCntLines(lines) {
  return lines.filter(isCntLineComplete).map(toCntLinePayload);
}

/**
 * @param {CntLineFormRow[]} current
 * @param {CntLineFormRow[]} initial
 */
export function areCntLinesDirty(current, initial) {
  return JSON.stringify(getPersistableCntLines(current)) !== JSON.stringify(getPersistableCntLines(initial));
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getStockCountDefaults>} baseline
 */
export function isCntHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  if ((values.warehouse_id ?? undefined) !== (baseline.warehouse_id ?? undefined)) return true;
  if (String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()) return true;
  const date = values.count_date;
  const dateStr = date && typeof date.format === "function" ? date.format("YYYY-MM-DD") : date;
  if ((dateStr ?? undefined) !== (baseline.count_date ?? undefined)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function canSaveCntDraft(values) {
  return values.warehouse_id != null;
}

/**
 * @param {Record<string, unknown>} values
 */
export function cntHeaderToPayload(values) {
  const date = values.count_date;
  return {
    warehouse_id: values.warehouse_id,
    count_date:
      date && typeof date.format === "function"
        ? date.format("YYYY-MM-DD")
        : typeof date === "string" && date
          ? date
          : undefined,
    notes:
      typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
}
