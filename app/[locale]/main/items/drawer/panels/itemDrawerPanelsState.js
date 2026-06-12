/**
 * Inline-edit value mappers and price formatting for UOM, barcode, and supplier panels.
 *
 * Used by:
 * - drawer/panels/uoms/useItemUomsPanel.js
 * - drawer/panels/barcodes/useItemBarcodesPanel.js
 * - drawer/panels/suppliers/useItemSuppliersPanel.js
 */

/** @typedef {{
 *   uom_id?: number;
 *   currency_id?: number;
 *   conversion_factor: number;
 *   barcode: string;
 *   selling_price?: number;
 *   cost_price?: number;
 *   takeaway_price?: number;
 *   dine_in_price?: number;
 *   delivery_price?: number;
 *   is_base: boolean;
 *   is_default_sale: boolean;
 *   is_default_purchase: boolean;
 * }} UomInlineValues */

/** @returns {UomInlineValues} */
export function defaultUomInlineValues() {
  return {
    uom_id: undefined,
    currency_id: undefined,
    conversion_factor: 1,
    barcode: "",
    selling_price: undefined,
    cost_price: undefined,
    takeaway_price: undefined,
    dine_in_price: undefined,
    delivery_price: undefined,
    is_base: false,
    is_default_sale: false,
    is_default_purchase: false,
  };
}

/** @param {Record<string, unknown>} row */
export function rowToUomInlineValues(row) {
  return {
    uom_id: row.uom?.id != null ? Number(row.uom.id) : row.uom_id != null ? Number(row.uom_id) : undefined,
    currency_id:
      row.currency?.id != null ? Number(row.currency.id) : row.currency_id != null ? Number(row.currency_id) : undefined,
    conversion_factor: Number(row.conversion_factor ?? 1),
    barcode: row.barcode != null ? String(row.barcode) : "",
    selling_price: row.selling_price != null ? Number(row.selling_price) : undefined,
    cost_price: row.cost_price != null ? Number(row.cost_price) : undefined,
    takeaway_price: row.takeaway_price != null ? Number(row.takeaway_price) : undefined,
    dine_in_price: row.dine_in_price != null ? Number(row.dine_in_price) : undefined,
    delivery_price: row.delivery_price != null ? Number(row.delivery_price) : undefined,
    is_base: Boolean(row.is_base),
    is_default_sale: Boolean(row.is_default_sale),
    is_default_purchase: Boolean(row.is_default_purchase),
  };
}

/** @param {UomInlineValues} values */
export function uomInlineValuesToBody(values) {
  return {
    uom_id: values.uom_id,
    currency_id: values.currency_id ?? null,
    conversion_factor: values.conversion_factor,
    barcode: null,
    selling_price: values.selling_price ?? null,
    cost_price: values.cost_price ?? null,
    takeaway_price: values.takeaway_price ?? null,
    dine_in_price: values.dine_in_price ?? null,
    delivery_price: values.delivery_price ?? null,
    is_base: values.is_base,
    is_default_sale: values.is_default_sale,
    is_default_purchase: values.is_default_purchase,
  };
}

/** @param {unknown} value */
export function formatDrawerPrice(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(2);
}

/** @typedef {{ barcode: string; item_uom_id?: number; is_primary: boolean }} BarcodeInlineValues */

/** @returns {BarcodeInlineValues} */
export function defaultBarcodeInlineValues() {
  return { barcode: "", item_uom_id: undefined, is_primary: false };
}

/** @param {Record<string, unknown>} row */
export function rowToBarcodeInlineValues(row) {
  return {
    barcode: row.barcode != null ? String(row.barcode) : "",
    item_uom_id:
      row.item_uom_id != null
        ? Number(row.item_uom_id)
        : row.item_uom?.id != null
          ? Number(row.item_uom.id)
          : undefined,
    is_primary: Boolean(row.is_primary),
  };
}

/** @param {BarcodeInlineValues} values */
export function barcodeInlineValuesToBody(values) {
  return {
    barcode: values.barcode.trim(),
    item_uom_id: values.item_uom_id ?? null,
    is_primary: values.is_primary,
  };
}

/** @typedef {{
 *   supplier_id?: string;
 *   supplier_sku: string;
 *   last_purchase_price?: number;
 *   currency_id?: number;
 *   lead_time_days?: number;
 *   is_preferred: boolean;
 * }} SupplierInlineValues */

/** @returns {SupplierInlineValues} */
export function defaultSupplierInlineValues() {
  return {
    supplier_id: undefined,
    supplier_sku: "",
    last_purchase_price: undefined,
    currency_id: undefined,
    lead_time_days: undefined,
    is_preferred: false,
  };
}

/** @param {Record<string, unknown>} row */
export function rowToSupplierInlineValues(row) {
  const supplierId =
    row.supplier?.id != null
      ? String(row.supplier.id)
      : row.supplier_id != null
        ? String(row.supplier_id)
        : undefined;
  return {
    supplier_id: supplierId,
    supplier_sku: row.supplier_sku != null ? String(row.supplier_sku) : "",
    last_purchase_price: row.last_purchase_price != null ? Number(row.last_purchase_price) : undefined,
    currency_id:
      row.currency?.id != null
        ? Number(row.currency.id)
        : row.currency_id != null
          ? Number(row.currency_id)
          : undefined,
    lead_time_days: row.lead_time_days != null ? Number(row.lead_time_days) : undefined,
    is_preferred: Boolean(row.is_preferred),
  };
}

/** @param {SupplierInlineValues} values */
export function supplierInlineValuesToBody(values) {
  return {
    supplier_sku: values.supplier_sku.trim() || null,
    last_purchase_price: values.last_purchase_price ?? null,
    currency_id: values.currency_id ?? null,
    lead_time_days: values.lead_time_days ?? null,
    is_preferred: values.is_preferred,
  };
}
