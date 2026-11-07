/**
 * Stock revaluation document drawer — defaults, line mapping, dirty checks, payloads.
 */

import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";

/**
 * @typedef {{
 *   warehouse_id?: number;
 *   item_id?: string;
 *   item_label?: string;
 *   lot_id?: number;
 *   track_lots?: boolean;
 * }} SrvCreateSeed
 */

/**
 * @typedef {{
 *   item_id?: string;
 *   item_label?: string;
 *   lot_id?: number;
 *   lot_number?: string;
 *   track_lots?: boolean;
 *   quantity_on_hand?: number | null;
 *   old_unit_cost?: number | null;
 *   new_unit_cost?: number | null;
 *   value_delta?: number | null;
 *   notes?: string;
 * }} SrvLineFormRow
 */

/**
 * @param {SrvCreateSeed | null | undefined} [seed]
 */
export function getStockRevaluationDefaults(seed = null) {
  return {
    warehouse_id: seed?.warehouse_id != null ? Number(seed.warehouse_id) : undefined,
    revaluation_date: dayjs(),
    notes: "",
  };
}

/**
 * @returns {SrvLineFormRow}
 */
export function getEmptySrvLine() {
  return {
    item_id: undefined,
    quantity_on_hand: undefined,
    old_unit_cost: undefined,
    new_unit_cost: undefined,
    value_delta: undefined,
    lot_id: undefined,
    lot_number: "",
    track_lots: false,
    notes: "",
  };
}

/**
 * @param {SrvCreateSeed | null | undefined} [seed]
 * @returns {SrvLineFormRow}
 */
export function getSeededSrvLine(seed = null) {
  if (seed?.item_id == null || String(seed.item_id) === "") {
    return getEmptySrvLine();
  }
  return {
    ...getEmptySrvLine(),
    item_id: String(seed.item_id),
    item_label: typeof seed.item_label === "string" ? seed.item_label : "",
    lot_id: seed.lot_id != null ? Number(seed.lot_id) : undefined,
    track_lots: Boolean(seed.track_lots || seed.lot_id),
  };
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapSrvRecordToForm(record) {
  return {
    warehouse_id: record.warehouse_id != null ? Number(record.warehouse_id) : undefined,
    revaluation_date: record.revaluation_date ?? undefined,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {SrvLineFormRow[]}
 */
export function mapSrvLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    item_label: typeof line.item?.name === "string" ? line.item.name : "",
    quantity_on_hand: line.quantity_on_hand != null ? Number(line.quantity_on_hand) : undefined,
    old_unit_cost: line.old_unit_cost != null ? Number(line.old_unit_cost) : undefined,
    new_unit_cost: line.new_unit_cost != null ? Number(line.new_unit_cost) : undefined,
    value_delta: line.value_delta != null ? Number(line.value_delta) : undefined,
    lot_id: line.lot_id != null ? Number(line.lot_id) : undefined,
    lot_number: typeof line.lot?.lot_number === "string" ? line.lot.lot_number : "",
    track_lots: Boolean(line.item?.track_lots),
    notes: typeof line.notes === "string" ? line.notes : "",
  }));
}

/**
 * @param {number | null | undefined} qty
 * @param {number | null | undefined} oldCost
 * @param {number | null | undefined} newCost
 */
export function computeSrvValueDelta(qty, oldCost, newCost) {
  if (qty == null || oldCost == null || newCost == null) return undefined;
  const q = Number(qty);
  const o = Number(oldCost);
  const n = Number(newCost);
  if (![q, o, n].every((v) => Number.isFinite(v))) return undefined;
  return q * (n - o);
}

/**
 * @param {SrvLineFormRow} line
 */
export function isSrvLinePersistable(line) {
  return (
    line.item_id != null &&
    String(line.item_id) !== "" &&
    line.new_unit_cost != null &&
    line.new_unit_cost !== "" &&
    Number.isFinite(Number(line.new_unit_cost))
  );
}

/**
 * @param {SrvLineFormRow} line
 */
export function isSrvLineComplete(line) {
  if (!isSrvLinePersistable(line)) return false;
  if (line.track_lots && line.lot_id == null) return false;
  return true;
}

/**
 * @param {SrvLineFormRow} line
 */
function toSrvLinePayload(line) {
  /** @type {Record<string, unknown>} */
  const row = {
    item_id: line.item_id,
    new_unit_cost: Number(line.new_unit_cost),
  };
  if (line.lot_id != null) row.lot_id = Number(line.lot_id);
  const notes = typeof line.notes === "string" ? line.notes.trim() : "";
  if (notes) row.notes = notes;
  return row;
}

/**
 * @param {SrvLineFormRow[]} lines
 */
export function getPersistableSrvLines(lines) {
  return lines.filter(isSrvLinePersistable).map(toSrvLinePayload);
}

/**
 * @param {SrvLineFormRow[]} lines
 */
export function getValidSrvLines(lines) {
  return lines.filter(isSrvLineComplete).map(toSrvLinePayload);
}

/**
 * @param {SrvLineFormRow[]} current
 * @param {SrvLineFormRow[]} initial
 */
export function areSrvLinesDirty(current, initial) {
  return JSON.stringify(getPersistableSrvLines(current)) !== JSON.stringify(getPersistableSrvLines(initial));
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getStockRevaluationDefaults>} baseline
 */
export function isSrvHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  if ((values.warehouse_id ?? undefined) !== (baseline.warehouse_id ?? undefined)) return true;
  if (String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()) return true;
  const date = values.revaluation_date;
  const dateStr = date && typeof date.format === "function" ? date.format("YYYY-MM-DD") : date;
  if ((dateStr ?? undefined) !== (baseline.revaluation_date ?? undefined)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function canSaveSrvDraft(values) {
  return values.warehouse_id != null;
}

/**
 * @param {Record<string, unknown>} values
 */
export function srvHeaderToPayload(values) {
  const date = values.revaluation_date;
  return {
    warehouse_id: values.warehouse_id,
    revaluation_date:
      date && typeof date.format === "function"
        ? date.format("YYYY-MM-DD")
        : typeof date === "string" && date
          ? date
          : undefined,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
}
