/**
 * Purchase invoice drawer — defaults, line mapping, dirty checks, payloads.
 */

import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";
import { formatItemOptionLabel } from "@/features/items/utils/formatItemLabel";

export const PI_BASE_UOM = /** @type {const} */ ("base");

/**
 * @typedef {{
 *   item_id?: string;
 *   item_label?: string;
 *   quantity?: number;
 *   item_uom_id?: number | string | null;
 *   item_uom_label?: string;
 *   unit_price?: number | null;
 *   tax_rate?: number | null;
 *   line_subtotal?: number | null;
 *   tax_amount?: number | null;
 *   line_total?: number | null;
 *   notes?: string;
 * }} PiLineFormRow
 */

export function getPurchaseInvoiceDefaults() {
  return {
    supplier_id: undefined,
    currency_id: undefined,
    payment_terms_id: undefined,
    invoice_date: dayjs(),
    due_date: undefined,
    supplier_reference: "",
    notes: "",
  };
}

/**
 * @returns {PiLineFormRow}
 */
export function getEmptyPiLine() {
  return {
    item_id: undefined,
    quantity: undefined,
    item_uom_id: PI_BASE_UOM,
    unit_price: undefined,
    notes: "",
  };
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapPiRecordToForm(record) {
  return {
    supplier_id: record.supplier_id ?? undefined,
    currency_id: record.currency_id != null ? Number(record.currency_id) : undefined,
    payment_terms_id:
      record.payment_terms_id != null ? Number(record.payment_terms_id) : undefined,
    invoice_date: record.invoice_date ? dayjs(String(record.invoice_date)) : dayjs(),
    due_date: record.due_date ? dayjs(String(record.due_date)) : undefined,
    supplier_reference: typeof record.supplier_reference === "string" ? record.supplier_reference : "",
    notes: typeof record.notes === "string" ? record.notes : "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {PiLineFormRow[]}
 */
export function mapPiLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    item_label: formatItemOptionLabel(
      line.item && typeof line.item === "object"
        ? /** @type {{ item_code?: unknown; name?: unknown; id?: unknown }} */ (line.item)
        : { id: line.item_id },
    ),
    quantity: line.quantity != null ? Number(line.quantity) : undefined,
    item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : PI_BASE_UOM,
    item_uom_label:
      typeof line.item_uom?.uom?.code === "string"
        ? line.item_uom.uom.code
        : typeof line.item_uom?.uom?.name === "string"
          ? line.item_uom.uom.name
          : "",
    unit_price: line.unit_price != null ? Number(line.unit_price) : undefined,
    tax_rate: line.tax_rate != null ? Number(line.tax_rate) : undefined,
    line_subtotal: line.line_subtotal != null ? Number(line.line_subtotal) : undefined,
    tax_amount: line.tax_amount != null ? Number(line.tax_amount) : undefined,
    line_total: line.line_total != null ? Number(line.line_total) : undefined,
    notes: typeof line.notes === "string" ? line.notes : "",
  }));
}

/**
 * @param {PiLineFormRow} line
 */
export function isValidPiLine(line) {
  return (
    Boolean(line.item_id) &&
    line.quantity != null &&
    Number(line.quantity) > 0 &&
    line.unit_price != null &&
    Number(line.unit_price) >= 0
  );
}

/**
 * @param {PiLineFormRow[]} lines
 */
export function getValidPiLines(lines) {
  return lines.filter(isValidPiLine);
}

/**
 * @param {PiLineFormRow[]} lines
 */
export function getPersistablePiLines(lines) {
  return getValidPiLines(lines).map((line) => ({
    item_id: line.item_id,
    quantity: line.quantity,
    item_uom_id: line.item_uom_id === PI_BASE_UOM || line.item_uom_id == null ? null : Number(line.item_uom_id),
    unit_price: line.unit_price,
    notes: line.notes?.trim() ? line.notes.trim() : null,
  }));
}

/**
 * @param {Record<string, unknown>} values
 */
export function piHeaderToPayload(values) {
  return {
    supplier_id: values.supplier_id,
    currency_id: values.currency_id != null ? Number(values.currency_id) : undefined,
    payment_terms_id:
      values.payment_terms_id != null && values.payment_terms_id !== ""
        ? Number(values.payment_terms_id)
        : null,
    invoice_date: values.invoice_date
      ? dayjs(/** @type {import("dayjs").ConfigType} */ (values.invoice_date)).format("YYYY-MM-DD")
      : undefined,
    due_date: values.due_date
      ? dayjs(/** @type {import("dayjs").ConfigType} */ (values.due_date)).format("YYYY-MM-DD")
      : null,
    supplier_reference:
      typeof values.supplier_reference === "string" && values.supplier_reference.trim()
        ? values.supplier_reference.trim()
        : null,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
}

/**
 * @param {Record<string, unknown>} values
 */
export function piCreatePayload(values) {
  return piHeaderToPayload(values);
}

/**
 * @param {Record<string, unknown>} values
 * @param {PiLineFormRow[]} [_lines]
 */
export function canSavePiDraft(values, _lines = []) {
  return Boolean(values.supplier_id && values.currency_id);
}

/**
 * @param {import("antd").FormInstance} form
 * @param {Record<string, unknown>} baseline
 */
export function isPiHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  const keys = ["supplier_id", "currency_id", "payment_terms_id", "supplier_reference", "notes"];
  for (const key of keys) {
    if (normalizeComparable(values?.[key]) !== normalizeComparable(baseline?.[key])) {
      return true;
    }
  }
  for (const key of ["invoice_date", "due_date"]) {
    if (normalizeComparable(values?.[key]) !== normalizeComparable(baseline?.[key])) {
      return true;
    }
  }
  return false;
}

/**
 * @param {PiLineFormRow[]} lines
 * @param {PiLineFormRow[]} baseline
 */
export function arePiLinesDirty(lines, baseline) {
  if (lines.length !== baseline.length) return true;
  return lines.some((line, index) => {
    const other = baseline[index];
    return (
      line.item_id !== other?.item_id ||
      Number(line.quantity ?? 0) !== Number(other?.quantity ?? 0) ||
      String(line.item_uom_id ?? "") !== String(other?.item_uom_id ?? "") ||
      Number(line.unit_price ?? 0) !== Number(other?.unit_price ?? 0) ||
      String(line.notes ?? "") !== String(other?.notes ?? "")
    );
  });
}

/**
 * @param {unknown} value
 */
function normalizeComparable(value) {
  if (value == null || value === "") return "";
  if (dayjs.isDayjs(value)) return value.format("YYYY-MM-DD");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return String(value);
}
