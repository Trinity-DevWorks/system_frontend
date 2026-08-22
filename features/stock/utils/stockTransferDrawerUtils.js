/**
 * Stock transfer drawer — defaults, line validation, dirty checks, API payloads.
 */

import { normalizeEntityId } from "@/lib/entityId";

/** Select value when the line uses the item's base UOM (API omits item_uom_id). */
export const STOCK_TRANSFER_BASE_UOM = "__stock_transfer_base_uom__";

/**
 * @typedef {{ item_id?: string; quantity?: number; item_uom_id?: number | string; notes?: string }} TransferLineFormRow
 */

export function getStockTransferDefaults() {
  return {
    from_warehouse_id: undefined,
    to_warehouse_id: undefined,
    notes: "",
  };
}

/**
 * @returns {TransferLineFormRow}
 */
export function getEmptyTransferLine() {
  return {
    item_id: undefined,
    quantity: undefined,
    item_uom_id: STOCK_TRANSFER_BASE_UOM,
    notes: "",
  };
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapTransferRecordToForm(record) {
  return {
    from_warehouse_id: record.from_warehouse_id,
    to_warehouse_id: record.to_warehouse_id,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {TransferLineFormRow[]}
 */
export function mapTransferLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    quantity: line.quantity != null ? Number(line.quantity) : undefined,
    item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : STOCK_TRANSFER_BASE_UOM,
    notes: typeof line.notes === "string" ? line.notes : "",
  }));
}

/**
 * @param {TransferLineFormRow[]} lines
 */
export function getValidTransferLines(lines) {
  return lines
    .filter(
      (line) =>
        line.item_id != null && line.quantity != null && Number(line.quantity) > 0,
    )
    .map((line) => {
      /** @type {{ item_id: string; quantity: number; item_uom_id?: number; notes?: string }} */
      const row = {
        item_id: String(line.item_id),
        quantity: Number(line.quantity),
      };
      if (
        line.item_uom_id != null &&
        line.item_uom_id !== STOCK_TRANSFER_BASE_UOM
      ) {
        row.item_uom_id = Number(line.item_uom_id);
      }
      const notes = typeof line.notes === "string" ? line.notes.trim() : "";
      if (notes) row.notes = notes;
      return row;
    });
}

/**
 * @param {TransferLineFormRow} line
 */
export function isTransferLineComplete(line) {
  return line.item_id != null && line.item_id !== "" && line.quantity != null && Number(line.quantity) > 0;
}

/**
 * @param {TransferLineFormRow[]} lines
 */
export function canAddTransferLine(lines) {
  return lines.length === 0 || lines.every(isTransferLineComplete);
}

/**
 * @param {TransferLineFormRow[]} current
 * @param {TransferLineFormRow[]} initial
 */
function serializeTransferLines(current, initial) {
  return JSON.stringify({
    current: getValidTransferLines(current).sort((a, b) => a.item_id.localeCompare(b.item_id)),
    initial: getValidTransferLines(initial).sort((a, b) => a.item_id.localeCompare(b.item_id)),
  });
}

/**
 * @param {TransferLineFormRow[]} current
 * @param {TransferLineFormRow[]} initial
 */
export function areTransferLinesDirty(current, initial) {
  return serializeTransferLines(current, initial) !== serializeTransferLines(initial, initial);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getStockTransferDefaults>} baseline
 */
export function isTransferHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  const fromId = values.from_warehouse_id ?? undefined;
  const toId = values.to_warehouse_id ?? undefined;
  const notes = String(values.notes ?? "").trim();

  if (fromId !== (baseline.from_warehouse_id ?? undefined)) return true;
  if (toId !== (baseline.to_warehouse_id ?? undefined)) return true;
  if (notes !== String(baseline.notes ?? "").trim()) return true;

  return false;
}

/**
 * @param {unknown} fromId
 * @param {unknown} toId
 */
export function transferWarehousesAreDistinct(fromId, toId) {
  if (fromId == null || toId == null) return true;
  return Number(fromId) !== Number(toId);
}

/**
 * @param {Record<string, unknown>} values
 */
export function transferHeaderRequiredFieldsValid(values) {
  const fromId = values.from_warehouse_id;
  const toId = values.to_warehouse_id;
  if (fromId == null || toId == null) return false;
  if (!transferWarehousesAreDistinct(fromId, toId)) return false;
  return true;
}

/**
 * @param {Record<string, unknown>} values
 * @param {TransferLineFormRow[]} lines
 */
export function canSaveTransferDraft(values, lines) {
  if (!transferHeaderRequiredFieldsValid(values)) return false;
  return getValidTransferLines(lines).length > 0;
}

/**
 * @param {Record<string, unknown>} values
 * @returns {Record<string, unknown>}
 */
export function transferHeaderToPayload(values) {
  return {
    from_warehouse_id: values.from_warehouse_id,
    to_warehouse_id: values.to_warehouse_id,
    notes:
      typeof values.notes === "string" && values.notes.trim()
        ? values.notes.trim()
        : null,
  };
}

/**
 * @param {Record<string, unknown>} values
 * @param {TransferLineFormRow[]} lines
 */
export function transferCreatePayload(values, lines) {
  return {
    ...transferHeaderToPayload(values),
    lines: getValidTransferLines(lines),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
export function toTransferCacheRow(record) {
  if (!record || typeof record !== "object") return null;
  return { ...record };
}
