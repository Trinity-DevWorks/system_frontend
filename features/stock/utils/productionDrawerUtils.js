/**
 * Production drawer — defaults, recipe scaling, line mapping, payloads.
 */

import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";
import { assignNewLotExpiry, expiryDatePayload } from "./stockLotUtils";

/**
 * @typedef {{
 *   item_id?: string;
 *   item_label?: string;
 *   quantity?: number;
 *   theoretical_quantity?: number;
 *   item_uom_id?: number | null;
 *   lot_id?: number;
 *   lot_number?: string;
 *   track_lots?: boolean;
 *   item_uom_label?: string;
 *   notes?: string;
 * }} PrdLineFormRow
 */

export function getProductionDefaults() {
  return {
    warehouse_id: undefined,
    item_id: undefined,
    quantity: undefined,
    production_date: dayjs(),
    notes: "",
    lot_id: undefined,
    lot_number: "",
    expiry_date: undefined,
  };
}

/**
 * @returns {PrdLineFormRow}
 */
export function getEmptyPrdLine() {
  return {
    item_id: undefined,
    quantity: undefined,
    theoretical_quantity: undefined,
    item_uom_id: undefined,
    lot_id: undefined,
    lot_number: "",
    track_lots: false,
    notes: "",
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} recipe
 */
export function recipeHasIngredients(recipe) {
  return Array.isArray(recipe?.ingredients) && recipe.ingredients.length > 0;
}

/**
 * @param {Record<string, unknown> | null | undefined} recipe
 */
export function recipeUomLabel(recipe) {
  const uom = recipe?.uom;
  if (typeof uom?.code === "string" && uom.code.trim()) return uom.code;
  if (typeof uom?.name === "string" && uom.name.trim()) return uom.name;
  return "";
}

/**
 * @param {Record<string, unknown> | null | undefined} recipe
 * @param {number | string | null | undefined} produceQty
 * @param {PrdLineFormRow[]} [previousLines]
 * @returns {PrdLineFormRow[]}
 */
export function scaleRecipeToLines(recipe, produceQty, previousLines = []) {
  const yieldQty = Number(recipe?.yield_quantity);
  const qty = Number(produceQty);
  if (!recipe || !Number.isFinite(yieldQty) || yieldQty <= 0 || !Number.isFinite(qty) || qty <= 0) {
    return [];
  }
  const factor = qty / yieldQty;
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const previousByItem = new Map(
    previousLines
      .filter((line) => line.item_id != null)
      .map((line) => [String(line.item_id), line]),
  );
  return ingredients.map((row) => {
    const theoretical = Number(row.quantity) * factor;
    const itemId = normalizeEntityId(row.item_id) ?? undefined;
    const previous = itemId != null ? previousByItem.get(String(itemId)) : undefined;
    return {
      item_id: itemId,
      item_label: typeof row.ingredient_item?.name === "string" ? row.ingredient_item.name : "",
      quantity: theoretical,
      theoretical_quantity: theoretical,
      item_uom_id: previous?.item_uom_id ?? null,
      lot_id: previous?.lot_id,
      lot_number: "",
      track_lots: Boolean(row.ingredient_item?.track_lots),
      item_uom_label:
        typeof row.uom?.code === "string" ? row.uom.code : typeof row.uom?.name === "string" ? row.uom.name : "",
      notes: typeof previous?.notes === "string" ? previous.notes : "",
    };
  });
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapPrdRecordToForm(record) {
  return {
    warehouse_id: record.warehouse_id != null ? Number(record.warehouse_id) : undefined,
    item_id: normalizeEntityId(record.item_id) ?? undefined,
    quantity: record.quantity != null ? Number(record.quantity) : undefined,
    production_date: record.production_date ?? undefined,
    notes: record.notes ?? "",
    lot_id: record.lot_id != null ? Number(record.lot_id) : undefined,
    lot_number: typeof record.lot?.lot_number === "string" ? record.lot.lot_number : "",
    expiry_date: typeof record.lot?.expiry_date === "string" ? record.lot.expiry_date : undefined,
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {PrdLineFormRow[]}
 */
export function mapPrdLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    item_label: typeof line.item?.name === "string" ? line.item.name : "",
    quantity: line.quantity != null ? Number(line.quantity) : undefined,
    theoretical_quantity: line.theoretical_quantity != null ? Number(line.theoretical_quantity) : undefined,
    item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : undefined,
    lot_id: line.lot_id != null ? Number(line.lot_id) : undefined,
    lot_number: typeof line.lot?.lot_number === "string" ? line.lot.lot_number : "",
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
 * @param {PrdLineFormRow} line
 */
export function isPrdLinePersistable(line) {
  return line.item_id != null && String(line.item_id) !== "" && line.quantity != null && Number(line.quantity) > 0;
}

/**
 * @param {PrdLineFormRow} line
 */
export function isPrdLineComplete(line) {
  if (!isPrdLinePersistable(line)) return false;
  if (line.track_lots && line.lot_id == null) {
    return false;
  }
  return true;
}

/**
 * @param {PrdLineFormRow} line
 */
function toPrdLinePayload(line) {
  /** @type {Record<string, unknown>} */
  const row = {
    item_id: line.item_id,
    quantity: Number(line.quantity),
  };
  if (line.theoretical_quantity != null) row.theoretical_quantity = Number(line.theoretical_quantity);
  if (line.item_uom_id != null) row.item_uom_id = Number(line.item_uom_id);
  if (line.lot_id != null) row.lot_id = Number(line.lot_id);
  const notes = typeof line.notes === "string" ? line.notes.trim() : "";
  if (notes) row.notes = notes;
  return row;
}

/**
 * @param {PrdLineFormRow[]} lines
 */
export function getPersistablePrdLines(lines) {
  return lines.filter(isPrdLinePersistable).map(toPrdLinePayload);
}

/**
 * @param {PrdLineFormRow[]} lines
 */
export function getValidPrdLines(lines) {
  return lines.filter(isPrdLineComplete).map(toPrdLinePayload);
}

/**
 * @param {PrdLineFormRow[]} current
 * @param {PrdLineFormRow[]} initial
 */
export function arePrdLinesDirty(current, initial) {
  return JSON.stringify(getPersistablePrdLines(current)) !== JSON.stringify(getPersistablePrdLines(initial));
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getProductionDefaults>} baseline
 */
export function isPrdHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  if ((values.warehouse_id ?? undefined) !== (baseline.warehouse_id ?? undefined)) return true;
  if ((values.item_id ?? undefined) !== (baseline.item_id ?? undefined)) return true;
  if (Number(values.quantity ?? 0) !== Number(baseline.quantity ?? 0)) return true;
  if ((values.lot_id ?? undefined) !== (baseline.lot_id ?? undefined)) return true;
  if (String(values.lot_number ?? "").trim() !== String(baseline.lot_number ?? "").trim()) return true;
  if ((expiryDatePayload(values.expiry_date) ?? "") !== (expiryDatePayload(baseline.expiry_date) ?? "")) return true;
  if (String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()) return true;
  const date = values.production_date;
  const dateStr = date && typeof date.format === "function" ? date.format("YYYY-MM-DD") : date;
  if ((dateStr ?? undefined) !== (baseline.production_date ?? undefined)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function canSavePrdDraft(values, hasIngredients = true) {
  return (
    values.warehouse_id != null &&
    values.item_id != null &&
    Number(values.quantity) > 0 &&
    hasIngredients
  );
}

/**
 * @param {Record<string, unknown>} values
 * @param {boolean} produceTrackLots
 */
export function isProduceLotComplete(values, produceTrackLots) {
  if (!produceTrackLots) return true;
  return values.lot_id != null || Boolean(String(values.lot_number ?? "").trim());
}

/**
 * @param {{
 *   values: Record<string, unknown>;
 *   lines: PrdLineFormRow[];
 *   produceTrackLots: boolean;
 * }} args
 */
export function canPostPrd({ values, lines, produceTrackLots }) {
  if (lines.length === 0) return false;
  if (!lines.every(isPrdLineComplete)) return false;
  return isProduceLotComplete(values, produceTrackLots);
}

/**
 * @param {Record<string, unknown>} values
 */
export function prdHeaderToPayload(values) {
  const date = values.production_date;
  /** @type {Record<string, unknown>} */
  const payload = {
    warehouse_id: values.warehouse_id,
    item_id: values.item_id,
    quantity: Number(values.quantity),
    production_date:
      date && typeof date.format === "function"
        ? date.format("YYYY-MM-DD")
        : typeof date === "string" && date
          ? date
          : undefined,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
  if (values.lot_id != null) payload.lot_id = Number(values.lot_id);
  const lotNumber = typeof values.lot_number === "string" ? values.lot_number.trim() : "";
  if (lotNumber && values.lot_id == null) payload.lot_number = lotNumber;
  assignNewLotExpiry(payload, values);
  return payload;
}

/**
 * @param {unknown} item
 */
export function isProduceItem(item) {
  return String(item?.item_type?.code ?? "").toUpperCase() === "PRODUCE";
}
