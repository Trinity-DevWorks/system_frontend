import dayjs from "dayjs";
import { SI_BASE_UOM, toIsoDate } from "@/features/sales-invoices/utils/salesInvoiceDrawerUtils";

/**
 * @typedef {{
 *   item_id?: string;
 *   item_label?: string;
 *   quantity?: number;
 *   item_uom_id?: number | string;
 *   unit_price?: number;
 *   discount_percent?: number;
 *   description?: string;
 *   vat_percentage?: number;
 *   tax_rate?: string | number;
 *   line_total?: string | number;
 * }} CommercialLine
 */

/** @returns {CommercialLine} */
export function emptyCommercialLine() {
  return {
    item_id: undefined,
    item_label: "",
    quantity: undefined,
    item_uom_id: SI_BASE_UOM,
    unit_price: undefined,
    discount_percent: 0,
    description: "",
  };
}

/**
 * @param {string} dateField
 * @param {string | null} extraDateField
 * @param {number | null | undefined} currencyId
 * @param {number | null | undefined} warehouseId
 */
export function commercialDefaults(dateField, extraDateField, currencyId, warehouseId) {
  return {
    customer_id: undefined,
    warehouse_id: warehouseId ?? undefined,
    currency_id: currencyId ?? undefined,
    salesman_id: undefined,
    payment_terms_id: undefined,
    [dateField]: dayjs(),
    ...(extraDateField ? { [extraDateField]: undefined } : {}),
    exchange_rate: 1,
    notes: "",
  };
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} dateField
 * @param {string | null} extraDateField
 */
export function mapCommercialHeader(record, dateField, extraDateField) {
  const date = record[dateField];
  const extra = extraDateField ? record[extraDateField] : null;
  return {
    customer_id: record.customer_id ?? undefined,
    warehouse_id: record.warehouse_id != null ? Number(record.warehouse_id) : undefined,
    currency_id: record.currency_id != null ? Number(record.currency_id) : undefined,
    salesman_id: record.salesman_id ?? undefined,
    payment_terms_id: record.payment_terms_id != null ? Number(record.payment_terms_id) : undefined,
    [dateField]: date ? dayjs(String(date).slice(0, 10)) : dayjs(),
    ...(extraDateField ? { [extraDateField]: extra ? dayjs(String(extra).slice(0, 10)) : undefined } : {}),
    exchange_rate: record.exchange_rate != null ? Number(record.exchange_rate) : 1,
    notes: typeof record.notes === "string" ? record.notes : "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} lines
 * @returns {CommercialLine[]}
 */
export function mapCommercialLines(lines) {
  return (lines ?? []).map((line) => ({
    item_id: line.item_id != null ? String(line.item_id) : undefined,
    item_label:
      line.item && typeof line.item === "object"
        ? String(line.item.item_code || line.item.name || line.item_id || "")
        : String(line.item_id ?? ""),
    quantity: line.quantity != null ? Number(line.quantity) : undefined,
    item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : SI_BASE_UOM,
    unit_price: line.unit_price != null ? Number(line.unit_price) : undefined,
    discount_percent: line.discount_percent != null ? Number(line.discount_percent) : 0,
    description: typeof line.description === "string" ? line.description : "",
    vat_percentage: line.item?.vat_group?.percentage != null ? Number(line.item.vat_group.percentage) : undefined,
    tax_rate: line.tax_rate,
    line_total: line.line_total,
  }));
}

/**
 * @param {CommercialLine[]} lines
 */
export function commercialLinesPayload(lines) {
  return lines
    .filter((line) => line.item_id && line.quantity != null && line.unit_price != null)
    .map((line) => {
      /** @type {Record<string, unknown>} */
      const row = {
        item_id: String(line.item_id),
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price),
        discount_percent: Number(line.discount_percent ?? 0),
      };
      if (line.item_uom_id != null && line.item_uom_id !== SI_BASE_UOM) {
        row.item_uom_id = Number(line.item_uom_id);
      }
      const description = typeof line.description === "string" ? line.description.trim() : "";
      if (description) row.description = description;
      return row;
    });
}

/**
 * @param {Record<string, unknown>} values
 * @param {string} dateField
 * @param {string | null} extraDateField
 * @param {boolean} includeWarehouse
 */
export function commercialHeaderPayload(values, dateField, extraDateField, includeWarehouse) {
  /** @type {Record<string, unknown>} */
  const body = {
    customer_id: values.customer_id,
    currency_id: values.currency_id ?? null,
    exchange_rate: values.exchange_rate != null ? Number(values.exchange_rate) : null,
    salesman_id: values.salesman_id || null,
    payment_terms_id: values.payment_terms_id ?? null,
    [dateField]: toIsoDate(values[dateField]),
    notes: typeof values.notes === "string" ? values.notes : null,
  };
  if (extraDateField) {
    body[extraDateField] = toIsoDate(values[extraDateField]);
  }
  if (includeWarehouse) {
    body.warehouse_id = values.warehouse_id;
  }
  return body;
}

/**
 * @param {string} status
 */
export function commercialStatusColor(status) {
  if (status === "accepted" || status === "confirmed" || status === "invoiced" || status === "converted") return "green";
  if (status === "sent" || status === "partially_invoiced") return "blue";
  if (status === "rejected" || status === "cancelled") return "red";
  if (status === "expired") return "orange";
  return "default";
}
