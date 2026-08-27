/**
 * Bundle explosion drawer — defaults, component scaling, line mapping, payloads.
 */

import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";

/**
 * @typedef {{
 *   item_id?: string;
 *   item_label?: string;
 *   quantity?: number;
 *   theoretical_quantity?: number;
 *   lot_id?: number;
 *   track_lots?: boolean;
 *   item_uom_label?: string;
 *   notes?: string;
 * }} BexLineFormRow
 */

export function getBundleExplosionDefaults() {
  return {
    warehouse_id: undefined,
    item_id: undefined,
    quantity: undefined,
    explosion_date: dayjs(),
    notes: "",
  };
}

/**
 * @param {unknown} item
 */
export function isBundleTypeItem(item) {
  return String(item?.item_type?.code ?? "").toUpperCase() === "BUNDLE";
}

/**
 * @param {unknown[] | null | undefined} components
 */
export function stockableBundleComponents(components) {
  return (Array.isArray(components) ? components : []).filter(
    (row) => row?.child_item?.track_inventory !== false,
  );
}

/**
 * @param {unknown[] | null | undefined} components
 */
export function bundleHasStockableComponents(components) {
  return stockableBundleComponents(components).length > 0;
}

/**
 * @param {unknown[] | null | undefined} components
 */
export function bundleComponentSignature(components) {
  return stockableBundleComponents(components)
    .map((row) => normalizeEntityId(row.child_item_id) ?? "")
    .filter(Boolean)
    .sort()
    .join(",");
}

/**
 * @param {unknown[] | null | undefined} components
 * @param {number | string | null | undefined} kitQty
 * @param {BexLineFormRow[]} [previousLines]
 * @returns {BexLineFormRow[]}
 */
export function scaleBundleToLines(components, kitQty, previousLines = []) {
  const qty = Number(kitQty);
  if (!Number.isFinite(qty) || qty <= 0) return [];
  const previousByItem = new Map(
    previousLines
      .filter((line) => line.item_id != null)
      .map((line) => [String(line.item_id), line]),
  );
  return stockableBundleComponents(components).map((row) => {
    const theoretical = Number(row.quantity) * qty;
    const itemId = normalizeEntityId(row.child_item_id) ?? undefined;
    const previous = itemId != null ? previousByItem.get(String(itemId)) : undefined;
    const uom = row.child_item?.base_uom;
    return {
      item_id: itemId,
      item_label: typeof row.child_item?.name === "string" ? row.child_item.name : "",
      quantity: theoretical,
      theoretical_quantity: theoretical,
      lot_id: previous?.lot_id,
      track_lots: Boolean(row.child_item?.track_lots),
      item_uom_label:
        typeof uom?.code === "string" ? uom.code : typeof uom?.name === "string" ? uom.name : "",
      notes: typeof previous?.notes === "string" ? previous.notes : "",
    };
  });
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapBexRecordToForm(record) {
  return {
    warehouse_id: record.warehouse_id != null ? Number(record.warehouse_id) : undefined,
    item_id: normalizeEntityId(record.item_id) ?? undefined,
    quantity: record.quantity != null ? Number(record.quantity) : undefined,
    explosion_date: record.explosion_date ?? undefined,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {BexLineFormRow[]}
 */
export function mapBexLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    item_label: typeof line.item?.name === "string" ? line.item.name : "",
    quantity: line.quantity != null ? Number(line.quantity) : undefined,
    theoretical_quantity: line.theoretical_quantity != null ? Number(line.theoretical_quantity) : undefined,
    lot_id: line.lot_id != null ? Number(line.lot_id) : undefined,
    track_lots: Boolean(line.item?.track_lots),
    item_uom_label:
      typeof line.item?.base_uom?.code === "string"
        ? line.item.base_uom.code
        : typeof line.item?.base_uom?.name === "string"
          ? line.item.base_uom.name
          : "",
    notes: typeof line.notes === "string" ? line.notes : "",
  }));
}

/**
 * @param {BexLineFormRow} line
 */
export function isBexLinePersistable(line) {
  return line.item_id != null && String(line.item_id) !== "" && line.quantity != null && Number(line.quantity) > 0;
}

/**
 * @param {BexLineFormRow} line
 */
export function isBexLineComplete(line) {
  if (!isBexLinePersistable(line)) return false;
  if (line.track_lots && line.lot_id == null) return false;
  return true;
}

/**
 * @param {BexLineFormRow} line
 */
function toBexLinePayload(line) {
  /** @type {Record<string, unknown>} */
  const row = {
    item_id: line.item_id,
    quantity: Number(line.quantity),
  };
  if (line.theoretical_quantity != null) row.theoretical_quantity = Number(line.theoretical_quantity);
  if (line.lot_id != null) row.lot_id = Number(line.lot_id);
  const notes = typeof line.notes === "string" ? line.notes.trim() : "";
  if (notes) row.notes = notes;
  return row;
}

/**
 * @param {BexLineFormRow[]} lines
 */
export function getPersistableBexLines(lines) {
  return lines.filter(isBexLinePersistable).map(toBexLinePayload);
}

/**
 * @param {BexLineFormRow[]} lines
 */
export function getValidBexLines(lines) {
  return lines.filter(isBexLineComplete).map(toBexLinePayload);
}

/**
 * @param {BexLineFormRow[]} current
 * @param {BexLineFormRow[]} initial
 */
export function areBexLinesDirty(current, initial) {
  return JSON.stringify(getPersistableBexLines(current)) !== JSON.stringify(getPersistableBexLines(initial));
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getBundleExplosionDefaults>} baseline
 */
export function isBexHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  if ((values.warehouse_id ?? undefined) !== (baseline.warehouse_id ?? undefined)) return true;
  if ((values.item_id ?? undefined) !== (baseline.item_id ?? undefined)) return true;
  if (Number(values.quantity ?? 0) !== Number(baseline.quantity ?? 0)) return true;
  if (String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()) return true;
  const date = values.explosion_date;
  const dateStr = date && typeof date.format === "function" ? date.format("YYYY-MM-DD") : date;
  if ((dateStr ?? undefined) !== (baseline.explosion_date ?? undefined)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function canSaveBexDraft(values, hasComponents = true) {
  return (
    values.warehouse_id != null &&
    values.item_id != null &&
    Number(values.quantity) > 0 &&
    hasComponents
  );
}

/**
 * @param {{
 *   lines: BexLineFormRow[];
 * }} args
 */
export function canPostBex({ lines }) {
  if (lines.length === 0) return false;
  return lines.every(isBexLineComplete);
}

/**
 * @param {Record<string, unknown>} values
 */
export function bexHeaderToPayload(values) {
  const date = values.explosion_date;
  return {
    warehouse_id: values.warehouse_id,
    item_id: values.item_id,
    quantity: Number(values.quantity),
    explosion_date:
      date && typeof date.format === "function"
        ? date.format("YYYY-MM-DD")
        : typeof date === "string" && date
          ? date
          : undefined,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
}
