/**
 * Purchase order drawer — defaults, line validation, dirty checks, API payloads.
 */

import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";

/** Select value when the line uses the item's base UOM (API omits item_uom_id). */
export const PO_BASE_UOM = "__po_base_uom__";

/**
 * @typedef {{
 *   item_id?: string;
 *   quantity?: number;
 *   item_uom_id?: number | string;
 *   unit_price?: number;
 *   unitPriceAuto?: boolean;
 *   notes?: string;
 * }} PurchaseOrderLineFormRow
 */

export function getPurchaseOrderDefaults() {
  return {
    supplier_id: undefined,
    warehouse_id: undefined,
    order_date: dayjs(),
    expected_date: undefined,
    notes: "",
  };
}

/**
 * @returns {PurchaseOrderLineFormRow}
 */
export function getEmptyPurchaseOrderLine() {
  return {
    item_id: undefined,
    quantity: undefined,
    item_uom_id: PO_BASE_UOM,
    unit_price: undefined,
    notes: "",
  };
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapPurchaseOrderRecordToForm(record) {
  return {
    supplier_id: record.supplier_id,
    warehouse_id: record.warehouse_id,
    order_date: record.order_date ? dayjs(String(record.order_date)) : dayjs(),
    expected_date: record.expected_date ? dayjs(String(record.expected_date)) : undefined,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {PurchaseOrderLineFormRow[]}
 */
export function mapPurchaseOrderLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    quantity: line.quantity != null ? Number(line.quantity) : undefined,
    item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : PO_BASE_UOM,
    unit_price: line.unit_price != null ? Number(line.unit_price) : undefined,
    notes: typeof line.notes === "string" ? line.notes : "",
  }));
}

/**
 * @param {PurchaseOrderLineFormRow[]} lines
 */
export function getValidPurchaseOrderLines(lines) {
  return lines
    .filter((line) => line.item_id != null && line.quantity != null && Number(line.quantity) > 0)
    .map((line) => {
      /** @type {Record<string, unknown>} */
      const row = {
        item_id: String(line.item_id),
        quantity: Number(line.quantity),
      };
      if (line.item_uom_id != null && line.item_uom_id !== PO_BASE_UOM) {
        row.item_uom_id = Number(line.item_uom_id);
      }
      if (line.unit_price != null && Number(line.unit_price) >= 0) {
        row.unit_price = Number(line.unit_price);
      }
      const notes = typeof line.notes === "string" ? line.notes.trim() : "";
      if (notes) row.notes = notes;
      return row;
    });
}

/**
 * @param {PurchaseOrderLineFormRow} line
 */
export function isPurchaseOrderLineComplete(line) {
  return line.item_id != null && line.item_id !== "" && line.quantity != null && Number(line.quantity) > 0;
}

/**
 * @param {PurchaseOrderLineFormRow[]} lines
 */
export function canAddPurchaseOrderLine(lines) {
  return lines.length === 0 || lines.every(isPurchaseOrderLineComplete);
}

/**
 * @param {PurchaseOrderLineFormRow[]} current
 * @param {PurchaseOrderLineFormRow[]} initial
 */
function serializePurchaseOrderLines(current, initial) {
  return JSON.stringify({
    current: getValidPurchaseOrderLines(current).sort((a, b) =>
      String(a.item_id).localeCompare(String(b.item_id)),
    ),
    initial: getValidPurchaseOrderLines(initial).sort((a, b) =>
      String(a.item_id).localeCompare(String(b.item_id)),
    ),
  });
}

/**
 * @param {PurchaseOrderLineFormRow[]} current
 * @param {PurchaseOrderLineFormRow[]} initial
 */
export function arePurchaseOrderLinesDirty(current, initial) {
  return serializePurchaseOrderLines(current, initial) !== serializePurchaseOrderLines(initial, initial);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getPurchaseOrderDefaults>} baseline
 */
export function isPurchaseOrderHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  const supplierId = values.supplier_id ?? undefined;
  const warehouseId = values.warehouse_id ?? undefined;
  const notes = String(values.notes ?? "").trim();
  const orderDate = values.order_date?.format?.("YYYY-MM-DD") ?? values.order_date ?? "";
  const expectedDate = values.expected_date?.format?.("YYYY-MM-DD") ?? values.expected_date ?? "";
  const baselineOrderDate =
    baseline.order_date?.format?.("YYYY-MM-DD") ?? baseline.order_date ?? "";
  const baselineExpectedDate =
    baseline.expected_date?.format?.("YYYY-MM-DD") ?? baseline.expected_date ?? "";

  if (supplierId !== (baseline.supplier_id ?? undefined)) return true;
  if (warehouseId !== (baseline.warehouse_id ?? undefined)) return true;
  if (notes !== String(baseline.notes ?? "").trim()) return true;
  if (orderDate !== baselineOrderDate) return true;
  if (expectedDate !== baselineExpectedDate) return true;

  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function purchaseOrderHeaderRequiredFieldsValid(values) {
  return values.supplier_id != null && values.warehouse_id != null && values.order_date != null;
}

/**
 * @param {Record<string, unknown>} values
 * @param {PurchaseOrderLineFormRow[]} lines
 */
export function canSavePurchaseOrderDraft(values, lines) {
  if (!purchaseOrderHeaderRequiredFieldsValid(values)) return false;
  return getValidPurchaseOrderLines(lines).length > 0;
}

/**
 * @param {Record<string, unknown>} values
 * @returns {Record<string, unknown>}
 */
export function purchaseOrderHeaderToPayload(values) {
  const orderDate = values.order_date?.format?.("YYYY-MM-DD") ?? values.order_date;
  const expectedDate = values.expected_date?.format?.("YYYY-MM-DD") ?? values.expected_date;

  return {
    supplier_id: values.supplier_id,
    warehouse_id: values.warehouse_id,
    order_date: orderDate,
    expected_date: expectedDate || null,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
}

/**
 * @param {Record<string, unknown>} values
 * @param {PurchaseOrderLineFormRow[]} lines
 */
export function purchaseOrderCreatePayload(values, lines) {
  return {
    ...purchaseOrderHeaderToPayload(values),
    lines: getValidPurchaseOrderLines(lines),
  };
}
