import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";

/** Select value when the line uses the item's base UOM (API omits item_uom_id). */
export const SI_BASE_UOM = "__si_base_uom__";

/** Sentinel for “Add new customer” on the invoice customer select. */
export const SI_LOOKUP_ADD_CUSTOMER = "__si_add_customer__";

/**
 * @param {...({ value: unknown } | null | undefined)} rows
 */
export function mergeLookupOptions(...rows) {
  /** @type {Map<string, { value: unknown }>} */
  const map = new Map();
  for (const row of rows) {
    if (!row || row.value == null || row.value === "") continue;
    map.set(String(row.value), row);
  }
  return [...map.values()];
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {{ value: string; label: string } | null}
 */
export function salesInvoiceSalesmanOption(row) {
  if (!row || row.id == null || row.id === "") return null;
  const code = String(row.salesman_code ?? row.code ?? "").trim();
  const name = String(row.full_name ?? row.name ?? row.id);
  return { value: /** @type {string} */ (row.id), label: code || name };
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {{ value: number; label: string } | null}
 */
export function salesInvoicePaymentMethodOption(row) {
  if (!row || row.id == null || row.id === "") return null;
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  const code = String(row.code ?? "").trim();
  const name = String(row.name ?? row.id);
  return { value: id, label: code || name };
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {{ value: number; label: string; due_days: number } | null}
 */
export function salesInvoicePaymentTermOption(row) {
  if (!row || row.id == null || row.id === "") return null;
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  const code = String(row.code ?? "").trim();
  const name = String(row.name ?? row.id);
  const days = Number(row.due_days ?? 0);
  const base = code || name;
  return { value: id, label: `${base} (${days}d)`, due_days: days };
}

/**
 * Compact code for invoice line selects (code only, no "code — name").
 * @param {unknown} code
 * @param {unknown} fallback
 * @returns {string}
 */
export function salesInvoiceCodeLabel(code, fallback) {
  const trimmed = typeof code === "string" ? code.trim() : "";
  if (trimmed) return trimmed;
  const name = typeof fallback === "string" ? fallback.trim() : "";
  return name;
}

/**
 * @param {{ item_code?: unknown; name?: unknown; id?: unknown } | null | undefined} item
 */
export function salesInvoiceItemCodeLabel(item) {
  return salesInvoiceCodeLabel(item?.item_code, item?.name) || String(item?.id ?? "");
}

/**
 * @param {{ code?: unknown; name?: unknown } | null | undefined} uom
 */
export function salesInvoiceUomCodeLabel(uom) {
  return salesInvoiceCodeLabel(uom?.code, uom?.name);
}

/**
 * @param {{ shortcut_name?: unknown; name?: unknown } | null | undefined} warehouse
 */
export function salesInvoiceWarehouseCodeLabel(warehouse) {
  return salesInvoiceCodeLabel(warehouse?.shortcut_name, warehouse?.name);
}

/**
 * Match select search against displayed code and hidden name.
 * @param {string} input
 * @param {{ label?: unknown; searchText?: unknown } | undefined} option
 */
export function salesInvoiceSelectFilter(input, option) {
  const query = String(input ?? "").trim().toLowerCase();
  if (!query) return true;
  const haystack = `${option?.label ?? ""} ${option?.searchText ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

/**
 * @typedef {{
 *   item_id?: string;
 *   item_label?: string;
 *   barcode?: string;
 *   quantity?: number;
 *   item_uom_id?: number | string;
 *   warehouse_id?: number;
 *   lot_id?: number | null;
 *   unit_price?: number;
 *   discount_percent?: number;
 *   description?: string;
 *   notes?: string;
 *   conversion_factor?: string | number;
 *   tax_rate?: string | number;
 *   vat_percentage?: string | number;
 *   discount_amount?: string | number;
 *   line_subtotal?: string | number;
 *   tax_amount?: string | number;
 *   line_total?: string | number;
 *   track_inventory?: boolean;
 *   track_lots?: boolean;
 * }} SalesInvoiceLineFormRow
 */

/**
 * @param {unknown} value
 */
export function toIsoDate(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (typeof value?.format === "function") return value.format("YYYY-MM-DD");
  return null;
}

export function getSalesInvoiceDefaults() {
  return {
    customer_id: undefined,
    warehouse_id: undefined,
    currency_id: undefined,
    salesman_id: undefined,
    payment_method_id: undefined,
    payment_terms_id: undefined,
    invoice_date: dayjs().format("YYYY-MM-DD"),
    due_on: dayjs().format("YYYY-MM-DD"),
    exchange_rate: 1,
    reference_2: "",
    billing_address_id: undefined,
    shipping_address_id: undefined,
    billing_address: {},
    shipping_address: {},
    adjustment: 0,
    notes: "",
  };
}

/**
 * @returns {SalesInvoiceLineFormRow}
 */
export function getEmptySalesInvoiceLine() {
  return {
    item_id: undefined,
    item_label: "",
    barcode: "",
    quantity: undefined,
    item_uom_id: SI_BASE_UOM,
    warehouse_id: undefined,
    lot_id: undefined,
    unit_price: undefined,
    discount_percent: 0,
    description: "",
    notes: "",
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} address
 */
export function customerAddressOptionLabel(address) {
  if (!address || typeof address !== "object") return "";
  const line1 = String(address.address_line_1 ?? "").trim();
  const line2 = String(address.address_line_2 ?? "").trim();
  return line1 || line2 || "";
}

/**
 * @param {Record<string, unknown> | null | undefined} address
 */
export function mapAddressSnapshot(address) {
  if (!address || typeof address !== "object") {
    return {
      id: undefined,
      address_type: undefined,
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      country: "",
      phone: "",
    };
  }
  return {
    id: address.id != null ? Number(address.id) : undefined,
    address_type: address.address_type ?? undefined,
    address_line_1: address.address_line_1 ?? "",
    address_line_2: address.address_line_2 ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    country: address.country ?? "",
    phone: address.phone ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} addresses
 * @param {"billing" | "shipping"} type
 * @param {Record<string, unknown> | null | undefined} snapshot
 */
export function customerAddressSelectOptions(addresses, type, snapshot = null) {
  const rows = (addresses ?? []).filter((row) => row?.address_type === type);
  /** @type {{ value: number; label: string; phone: string; address: Record<string, unknown> }[]} */
  const options = [];
  const seen = new Set();
  for (const row of rows) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    const label = customerAddressOptionLabel(row);
    if (!label) continue;
    options.push({
      value: id,
      label,
      phone: typeof row.phone === "string" ? row.phone : "",
      address: mapAddressSnapshot(row),
    });
  }
  const snapId = snapshot?.id != null ? Number(snapshot.id) : NaN;
  if (Number.isFinite(snapId) && !seen.has(snapId)) {
    const label = customerAddressOptionLabel(snapshot);
    if (label) {
      options.unshift({
        value: snapId,
        label,
        phone: typeof snapshot.phone === "string" ? snapshot.phone : "",
        address: mapAddressSnapshot(snapshot),
      });
    }
  }
  return options;
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapSalesInvoiceRecordToForm(record) {
  return {
    customer_id: record.customer_id,
    warehouse_id: record.warehouse_id,
    currency_id: record.currency_id,
    salesman_id: record.salesman_id ?? undefined,
    payment_method_id: record.payment_method_id ?? undefined,
    payment_terms_id: record.payment_terms_id ?? undefined,
    invoice_date: record.invoice_date ? String(record.invoice_date).slice(0, 10) : dayjs().format("YYYY-MM-DD"),
    due_on: record.due_on ? String(record.due_on).slice(0, 10) : undefined,
    exchange_rate: record.exchange_rate != null ? Number(record.exchange_rate) : undefined,
    reference_2: record.reference_2 ?? "",
    billing_address_id: record.billing_address?.id != null ? Number(record.billing_address.id) : undefined,
    shipping_address_id: record.shipping_address?.id != null ? Number(record.shipping_address.id) : undefined,
    billing_address: mapAddressSnapshot(
      /** @type {Record<string, unknown> | null} */ (record.billing_address),
    ),
    shipping_address: mapAddressSnapshot(
      /** @type {Record<string, unknown> | null} */ (record.shipping_address),
    ),
    adjustment: record.adjustment != null ? Number(record.adjustment) : 0,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @returns {SalesInvoiceLineFormRow[]}
 */
export function mapSalesInvoiceLinesFromApi(lines) {
  return (lines ?? []).map((line) => ({
    item_id: normalizeEntityId(line.item_id) ?? undefined,
    item_label: salesInvoiceItemCodeLabel(
      line.item && typeof line.item === "object"
        ? /** @type {{ item_code?: unknown; name?: unknown; id?: unknown }} */ (line.item)
        : { id: line.item_id },
    ),
    barcode: typeof line.item_uom?.barcode === "string" ? line.item_uom.barcode : "",
    quantity: line.quantity != null ? Number(line.quantity) : undefined,
    item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : SI_BASE_UOM,
    warehouse_id: line.warehouse_id != null ? Number(line.warehouse_id) : undefined,
    lot_id: line.lot_id != null ? Number(line.lot_id) : undefined,
    unit_price: line.unit_price != null ? Number(line.unit_price) : undefined,
    discount_percent: line.discount_percent != null ? Number(line.discount_percent) : 0,
    description: typeof line.description === "string" ? line.description : "",
    notes: typeof line.notes === "string" ? line.notes : "",
    conversion_factor: line.conversion_factor,
    tax_rate: line.tax_rate,
    vat_percentage: line.item?.vat_group?.percentage,
    discount_amount: line.discount_amount,
    line_subtotal: line.line_subtotal,
    tax_amount: line.tax_amount,
    line_total: line.line_total,
    track_inventory: Boolean(line.item?.track_inventory),
    track_lots: Boolean(line.item?.track_lots),
  }));
}

/**
 * @param {SalesInvoiceLineFormRow[]} lines
 */
export function getValidSalesInvoiceLines(lines) {
  return lines
    .filter((line) => line.item_id != null && line.quantity != null && Number(line.quantity) > 0)
    .map((line) => {
      /** @type {Record<string, unknown>} */
      const row = {
        item_id: String(line.item_id),
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price ?? 0),
      };
      if (line.item_uom_id != null && line.item_uom_id !== SI_BASE_UOM) {
        row.item_uom_id = Number(line.item_uom_id);
      }
      if (line.warehouse_id != null) {
        row.warehouse_id = Number(line.warehouse_id);
      }
      if (line.lot_id != null) {
        row.lot_id = Number(line.lot_id);
      }
      if (line.discount_percent != null) {
        row.discount_percent = Number(line.discount_percent);
      }
      const description = typeof line.description === "string" ? line.description.trim() : "";
      if (description) row.description = description;
      const notes = typeof line.notes === "string" ? line.notes.trim() : "";
      if (notes) row.notes = notes;
      return row;
    });
}

/**
 * @param {SalesInvoiceLineFormRow} line
 */
export function isSalesInvoiceLineComplete(line) {
  return (
    line.item_id != null &&
    line.item_id !== "" &&
    line.quantity != null &&
    Number(line.quantity) > 0 &&
    line.unit_price != null &&
    Number(line.unit_price) >= 0
  );
}

/**
 * Fill a line from `items/lookup-by-barcode`.
 * Pass `incrementQuantity` only for a true rescan of the same committed barcode
 * (e.g. scanner Enter again) — not when the user edits/clears the field and looks up again.
 *
 * @param {SalesInvoiceLineFormRow} row
 * @param {{ item?: Record<string, unknown>; item_uom?: Record<string, unknown> } | null | undefined} result
 * @param {string} scannedBarcode
 * @param {number | undefined} headerWarehouseId
 * @param {{ incrementQuantity?: boolean }} [options]
 * @returns {Partial<SalesInvoiceLineFormRow> | null}
 */
export function salesInvoiceLinePatchFromBarcodeLookup(
  row,
  result,
  scannedBarcode,
  headerWarehouseId,
  options = {},
) {
  const item = result?.item;
  if (!item || item.id == null) return null;
  const itemUom = result?.item_uom;
  const itemId = String(item.id);
  const sameItem = row.item_id != null && String(row.item_id) === itemId;
  const trackInventory = Boolean(item.track_inventory);
  const description =
    typeof item.description === "string" && item.description.trim()
      ? item.description
      : typeof item.name === "string"
        ? item.name
        : "";
  const incrementQuantity = Boolean(options.incrementQuantity);
  return {
    barcode: scannedBarcode,
    item_id: itemId,
    item_label: salesInvoiceItemCodeLabel(item),
    item_uom_id: itemUom?.id != null ? Number(itemUom.id) : SI_BASE_UOM,
    conversion_factor: itemUom?.conversion_factor != null ? itemUom.conversion_factor : 1,
    unit_price: itemUom?.selling_price != null ? Number(itemUom.selling_price) : undefined,
    description,
    track_inventory: trackInventory,
    track_lots: Boolean(item.track_lots),
    warehouse_id: trackInventory ? (row.warehouse_id ?? headerWarehouseId) : undefined,
    lot_id: sameItem ? row.lot_id : undefined,
    vat_percentage:
      item.vat_group && item.vat_group.percentage != null
        ? Number(item.vat_group.percentage)
        : item.vat_percentage != null
          ? Number(item.vat_percentage)
          : 0,
    quantity:
      incrementQuantity && row.quantity != null && Number(row.quantity) > 0
        ? Number(row.quantity) + 1
        : 1,
  };
}

/**
 * @param {SalesInvoiceLineFormRow[]} lines
 */
export function canAddSalesInvoiceLine(lines) {
  return lines.length === 0 || lines.every(isSalesInvoiceLineComplete);
}

/**
 * @param {SalesInvoiceLineFormRow[]} current
 * @param {SalesInvoiceLineFormRow[]} initial
 */
function serializeSalesInvoiceLines(current) {
  return JSON.stringify(
    getValidSalesInvoiceLines(current).map((row) => ({
      item_id: row.item_id,
      quantity: row.quantity,
      item_uom_id: row.item_uom_id ?? null,
      warehouse_id: row.warehouse_id ?? null,
      lot_id: row.lot_id ?? null,
      unit_price: row.unit_price,
      discount_percent: row.discount_percent ?? 0,
      description: row.description ?? "",
      notes: row.notes ?? "",
    })),
  );
}

/**
 * @param {SalesInvoiceLineFormRow[]} current
 * @param {SalesInvoiceLineFormRow[]} initial
 */
export function areSalesInvoiceLinesDirty(current, initial) {
  return serializeSalesInvoiceLines(current) !== serializeSalesInvoiceLines(initial);
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function sameLookupId(a, b) {
  const left = a == null || a === "" ? undefined : a;
  const right = b == null || b === "" ? undefined : b;
  if (left === right) return true;
  if (left == null || right == null) return false;
  return String(left) === String(right);
}

/**
 * @param {unknown} address
 */
function serializeAddress(address) {
  const row = address && typeof address === "object" ? address : {};
  const id = row.id == null || row.id === "" ? null : Number(row.id);
  return JSON.stringify({
    id: Number.isFinite(id) ? id : null,
    address_line_1: String(row.address_line_1 ?? "").trim(),
    address_line_2: String(row.address_line_2 ?? "").trim(),
    phone: String(row.phone ?? "").trim(),
  });
}

/**
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getSalesInvoiceDefaults>} baseline
 */
export function isSalesInvoiceHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  const keys = [
    "customer_id",
    "warehouse_id",
    "currency_id",
    "salesman_id",
    "payment_method_id",
    "payment_terms_id",
  ];
  for (const key of keys) {
    if (!sameLookupId(values[key], baseline[key])) return true;
  }
  if (toIsoDate(values.invoice_date) !== toIsoDate(baseline.invoice_date)) return true;
  if (toIsoDate(values.due_on) !== toIsoDate(baseline.due_on)) return true;
  if (String(values.reference_2 ?? "").trim() !== String(baseline.reference_2 ?? "").trim()) return true;
  if (String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()) return true;
  if (Number(values.adjustment ?? 0) !== Number(baseline.adjustment ?? 0)) return true;
  if (Number(values.exchange_rate ?? 1) !== Number(baseline.exchange_rate ?? 1)) return true;
  if (!sameLookupId(values.billing_address_id, baseline.billing_address_id)) return true;
  if (!sameLookupId(values.shipping_address_id, baseline.shipping_address_id)) return true;
  if (serializeAddress(values.billing_address) !== serializeAddress(baseline.billing_address)) return true;
  if (serializeAddress(values.shipping_address) !== serializeAddress(baseline.shipping_address)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function salesInvoiceHeaderRequiredFieldsValid(values) {
  return values.customer_id != null && values.warehouse_id != null && values.invoice_date != null;
}

/**
 * @param {Record<string, unknown>} values
 * @param {SalesInvoiceLineFormRow[]} lines
 */
export function canSaveSalesInvoiceDraft(values, lines) {
  if (!salesInvoiceHeaderRequiredFieldsValid(values)) return false;
  return getValidSalesInvoiceLines(lines).length > 0;
}

/**
 * @param {unknown} address
 */
function addressToPayload(address, selectedId) {
  if (!address || typeof address !== "object") {
    const idOnly = selectedId != null && selectedId !== "" ? Number(selectedId) : NaN;
    if (Number.isFinite(idOnly) && idOnly > 0) return { id: idOnly };
    return null;
  }
  const line1 = String(address.address_line_1 ?? "").trim();
  const line2 = String(address.address_line_2 ?? "").trim();
  const phone = String(address.phone ?? "").trim();
  const id = selectedId ?? address.id;
  const numericId = id != null && id !== "" ? Number(id) : NaN;
  if (!line1 && !line2 && !phone) {
    return Number.isFinite(numericId) && numericId > 0 ? { id: numericId } : null;
  }
  return {
    id: Number.isFinite(numericId) && numericId > 0 ? numericId : null,
    address_type: address.address_type ?? null,
    address_line_1: line1,
    address_line_2: line2 || null,
    city: String(address.city ?? "").trim(),
    state: String(address.state ?? "").trim(),
    country: String(address.country ?? "").trim(),
    phone: phone || null,
  };
}

/**
 * @param {Record<string, unknown>} values
 * @returns {Record<string, unknown>}
 */
export function salesInvoiceHeaderToPayload(values) {
  const billing = addressToPayload(values.billing_address, values.billing_address_id);
  const shipping = addressToPayload(values.shipping_address, values.shipping_address_id);
  return {
    customer_id: values.customer_id,
    warehouse_id: values.warehouse_id,
    currency_id: values.currency_id,
    salesman_id: values.salesman_id ?? null,
    payment_method_id: values.payment_method_id ?? null,
    payment_terms_id: values.payment_terms_id ?? null,
    invoice_date: toIsoDate(values.invoice_date),
    due_on: toIsoDate(values.due_on),
    exchange_rate: values.exchange_rate != null && values.exchange_rate !== "" ? Number(values.exchange_rate) : null,
    reference_2: typeof values.reference_2 === "string" && values.reference_2.trim() ? values.reference_2.trim() : null,
    billing_address: billing,
    shipping_address: shipping,
    adjustment: values.adjustment != null ? Number(values.adjustment) : 0,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
  };
}

/**
 * @param {Record<string, unknown>} values
 * @param {SalesInvoiceLineFormRow[]} lines
 */
export function salesInvoiceCreatePayload(values, lines) {
  return {
    ...salesInvoiceHeaderToPayload(values),
    lines: getValidSalesInvoiceLines(lines),
  };
}

/**
 * @param {string | null | undefined} invoiceDate
 * @param {number} dueDays
 */
export function suggestedDueOn(invoiceDate, dueDays) {
  const base = invoiceDate ? dayjs(invoiceDate) : dayjs();
  if (!base.isValid()) return dayjs().format("YYYY-MM-DD");
  return base.add(Number(dueDays) || 0, "day").format("YYYY-MM-DD");
}
