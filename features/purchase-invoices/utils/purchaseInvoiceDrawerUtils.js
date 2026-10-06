import dayjs from "dayjs";
import { normalizeEntityId } from "@/lib/entityId";
import { UNTRACKED_LINE_PRICE, linePriceFromPrimary, positiveRate } from "@/lib/currency/documentExchangeRate";
import { getTenantFormatSettings } from "@/lib/tenant-format-runtime";
import {
  mergeLookupOptions,
  salesInvoiceCodeLabel,
  salesInvoicePaymentMethodOption,
  salesInvoicePaymentTermOption,
  salesInvoiceSelectFilter,
  salesInvoiceUomCodeLabel,
  salesInvoiceWarehouseCodeLabel,
  suggestedDueOn,
  toIsoDate,
} from "@/features/sales-invoices/utils/salesInvoiceDrawerUtils";

export { mergeLookupOptions, salesInvoiceSelectFilter as purchaseInvoiceSelectFilter, suggestedDueOn };

/** Select value when the line uses the item's base UOM (API omits item_uom_id). */
export const PI_BASE_UOM = "__pi_base_uom__";

/** Sentinel for “Add new supplier” on the invoice supplier select. */
export const PI_LOOKUP_ADD_SUPPLIER = "__pi_add_supplier__";

export {
  salesInvoicePaymentMethodOption as purchaseInvoicePaymentMethodOption,
  salesInvoicePaymentTermOption as purchaseInvoicePaymentTermOption,
  salesInvoiceCodeLabel as purchaseInvoiceCodeLabel,
  salesInvoiceUomCodeLabel as purchaseInvoiceUomCodeLabel,
  salesInvoiceWarehouseCodeLabel as purchaseInvoiceWarehouseCodeLabel,
};

/**
 * @param {{ item_code?: unknown; name?: unknown; id?: unknown } | null | undefined} item
 */
export function purchaseInvoiceItemCodeLabel(item) {
  return salesInvoiceCodeLabel(item?.item_code, item?.name) || String(item?.id ?? "");
}

/**
 * @param {Record<string, unknown> | null | undefined} supplier
 * @returns {string | undefined}
 */
export function purchaseInvoiceSupplierHoverTitle(supplier) {
  if (!supplier || typeof supplier !== "object") return undefined;
  const name = String(supplier.name ?? "").trim();
  const phone = typeof supplier.phone === "string" ? supplier.phone.trim() : "";
  if (name && phone) return `${name} - ${phone}`;
  return name || phone || undefined;
}

/**
 * @param {Record<string, unknown> | null | undefined} supplier
 * @returns {{ value: unknown; label: string; title?: string; searchText?: string } | null}
 */
export function mapPurchaseInvoiceSupplierOption(supplier) {
  if (!supplier || supplier.id == null || supplier.id === "") return null;
  if (supplier.is_active === false) return null;
  const code = typeof supplier.supplier_code === "string" ? supplier.supplier_code.trim() : "";
  const name = String(supplier.name ?? supplier.id);
  const phone = typeof supplier.phone === "string" ? supplier.phone.trim() : "";
  const email = typeof supplier.email === "string" ? supplier.email.trim() : "";
  const title = purchaseInvoiceSupplierHoverTitle({ name, phone });
  return {
    value: supplier.id,
    label: code || name,
    title,
    supplier_code: code || undefined,
    name,
    phone: phone || undefined,
    email: email || undefined,
    searchText: [code, name, phone, email].filter(Boolean).join(" "),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} grn
 * @returns {{ value: string; label: string; searchText?: string } | null}
 */
export function mapPurchaseInvoiceGrnOption(grn) {
  if (!grn || grn.id == null || grn.id === "") return null;
  const number = String(grn.grn_number ?? grn.id);
  return {
    value: String(grn.id),
    label: number,
    searchText: number,
    warehouse_id: grn.warehouse_id,
    supplier_id: grn.supplier_id ?? grn.supplier?.id,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} order
 * @returns {{ value: string; label: string; searchText?: string } | null}
 */
export function mapPurchaseInvoicePoOption(order) {
  if (!order || order.id == null || order.id === "") return null;
  const number = String(order.po_number ?? order.id);
  return {
    value: String(order.id),
    label: number,
    searchText: number,
    warehouse_id: order.warehouse_id,
    supplier_id: order.supplier_id ?? order.supplier?.id,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} item
 */
export function purchaseInvoiceItemDescription(item) {
  if (!item || typeof item !== "object") return "";
  if (typeof item.description === "string" && item.description.trim()) return item.description.trim();
  if (typeof item.name === "string" && item.name.trim()) return item.name.trim();
  return "";
}

/**
 * @param {Record<string, unknown> | null | undefined} uomRow
 */
export function purchaseUomUnitCost(uomRow) {
  if (!uomRow || typeof uomRow !== "object") return undefined;
  const candidates = ["cost_price", "cost", "purchase_price", "buying_price"];
  for (const key of candidates) {
    if (uomRow[key] != null && uomRow[key] !== "") {
      const n = Number(uomRow[key]);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

/**
 * @param {Record<string, unknown> | null | undefined} item
 */
export function mapPurchaseInvoiceItemOption(item) {
  if (!item || item.id == null || item.id === "") return null;
  if (item.allow_purchase === false || item.is_active === false) return null;
  const code = typeof item.item_code === "string" ? item.item_code.trim() : "";
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const label = code || name || String(item.id);
  const vatFromGroup =
    item.vat_group && typeof item.vat_group === "object" && item.vat_group.percentage != null
      ? Number(item.vat_group.percentage)
      : null;
  const vatDirect = item.vat_percentage != null ? Number(item.vat_percentage) : null;
  const description = purchaseInvoiceItemDescription(item);
  return {
    value: String(item.id),
    label,
    name,
    description,
    searchText: `${item.sku ?? ""} ${item.item_code ?? ""} ${item.plu_code ?? ""} ${item.name ?? ""}`,
    track_inventory: Boolean(item.track_inventory),
    track_lots: Boolean(item.track_lots),
    vat_percentage: Number.isFinite(vatFromGroup) ? vatFromGroup : Number.isFinite(vatDirect) ? vatDirect : 0,
  };
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
 *   lot_number?: string;
 *   expiry_date?: string;
 *   unit_price?: number;
 *   discount_percent?: number;
 *   description?: string;
 *   notes?: string;
 *   goods_receipt_line_id?: number | string;
 *   grn_quantity?: number;
 *   grn_unit_cost?: number;
 *   purchase_order_line_id?: number | string;
 *   po_quantity?: number;
 *   po_unit_price?: number;
 *   qty_mismatch?: boolean;
 *   price_mismatch?: boolean;
 *   conversion_factor?: string | number;
 *   tax_rate?: string | number;
 *   vat_percentage?: string | number;
 *   discount_amount?: string | number;
 *   line_subtotal?: string | number;
 *   tax_amount?: string | number;
 *   line_total?: string | number;
 *   track_inventory?: boolean;
 *   track_lots?: boolean;
 *   catalogReloadKey?: number;
 *   price_base?: number;
 *   price_rate?: number | null;
 *   price_source?: "catalog" | "document" | "saved" | "manual";
 * }} PurchaseInvoiceLineFormRow
 */

export function getPurchaseInvoiceDefaults() {
  return {
    supplier_id: undefined,
    goods_receipt_id: undefined,
    purchase_order_id: undefined,
    warehouse_id: undefined,
    currency_id: undefined,
    payment_method_id: undefined,
    payment_terms_id: undefined,
    invoice_date: dayjs().format("YYYY-MM-DD"),
    due_on: dayjs().format("YYYY-MM-DD"),
    exchange_rate: 1,
    reference_2: "",
    use_linked_proof: false,
    linked_proof_id: "",
    adjustment: 0,
    notes: "",
  };
}

/**
 * @returns {PurchaseInvoiceLineFormRow}
 */
export function getEmptyPurchaseInvoiceLine() {
  return {
    item_id: undefined,
    item_label: "",
    barcode: "",
    quantity: undefined,
    item_uom_id: PI_BASE_UOM,
    warehouse_id: undefined,
    lot_id: undefined,
    lot_number: undefined,
    expiry_date: undefined,
    unit_price: undefined,
    discount_percent: 0,
    description: "",
    notes: "",
    goods_receipt_line_id: undefined,
    grn_quantity: undefined,
    grn_unit_cost: undefined,
    purchase_order_line_id: undefined,
    po_quantity: undefined,
    po_unit_price: undefined,
    qty_mismatch: false,
    price_mismatch: false,
  };
}

/**
 * @param {PurchaseInvoiceLineFormRow} line
 */
export function computePurchaseInvoiceLineMismatchFlags(line) {
  const poLinked = line.purchase_order_line_id != null && line.purchase_order_line_id !== "";
  const grnLinked = line.goods_receipt_line_id != null && line.goods_receipt_line_id !== "";
  if (!poLinked && !grnLinked) {
    return { qty_mismatch: false, price_mismatch: false };
  }
  const sourceQty = poLinked ? line.po_quantity : line.grn_quantity;
  const sourcePrice = poLinked ? line.po_unit_price : line.grn_unit_cost;
  const qtyMismatch =
    sourceQty != null && line.quantity != null && Number(line.quantity) !== Number(sourceQty);
  const priceDecimals = getTenantFormatSettings().priceDecimalPlaces;
  const expectedPrice =
    sourcePrice != null
      ? linePriceFromPrimary(sourcePrice, positiveRate(line.price_rate) ?? 1, priceDecimals, "document").unit_price
      : undefined;
  const priceMismatch =
    expectedPrice != null &&
    line.unit_price != null &&
    Number(line.unit_price).toFixed(priceDecimals) !== Number(expectedPrice).toFixed(priceDecimals);
  return { qty_mismatch: qtyMismatch, price_mismatch: priceMismatch };
}

/**
 * @param {PurchaseInvoiceLineFormRow} line
 * @returns {PurchaseInvoiceLineFormRow}
 */
export function withPurchaseInvoiceLineMismatchFlags(line) {
  const flags = computePurchaseInvoiceLineMismatchFlags(line);
  return { ...line, ...flags };
}

/**
 * @param {Record<string, unknown>} record
 */
export function mapPurchaseInvoiceRecordToForm(record) {
  return {
    supplier_id: record.supplier_id,
    goods_receipt_id: record.goods_receipt_id ?? undefined,
    purchase_order_id: record.purchase_order_id ?? undefined,
    warehouse_id: record.warehouse_id,
    currency_id: record.currency_id,
    payment_method_id: record.payment_method_id ?? undefined,
    payment_terms_id: record.payment_terms_id ?? undefined,
    invoice_date: record.invoice_date ? String(record.invoice_date).slice(0, 10) : dayjs().format("YYYY-MM-DD"),
    due_on: record.due_on ? String(record.due_on).slice(0, 10) : undefined,
    exchange_rate: record.exchange_rate != null ? Number(record.exchange_rate) : undefined,
    reference_2: record.reference_2 ?? "",
    use_linked_proof: Boolean(record.linked_proof_id),
    linked_proof_id: record.linked_proof_id ?? "",
    adjustment: record.adjustment != null ? Number(record.adjustment) : 0,
    notes: record.notes ?? "",
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined | null} lines
 * @param {unknown} [exchangeRate] invoice rate the saved prices are expressed in
 * @returns {PurchaseInvoiceLineFormRow[]}
 */
export function mapPurchaseInvoiceLinesFromApi(lines, exchangeRate = 1) {
  const priceRate = positiveRate(exchangeRate) ?? 1;
  return (lines ?? []).map((line) => {
    const row = {
      price_rate: priceRate,
      price_source: "saved",
      item_id: normalizeEntityId(line.item_id) ?? undefined,
      item_label: purchaseInvoiceItemCodeLabel(
        line.item && typeof line.item === "object"
          ? /** @type {{ item_code?: unknown; name?: unknown; id?: unknown }} */ (line.item)
          : { id: line.item_id },
      ),
      barcode: typeof line.item_uom?.barcode === "string" ? line.item_uom.barcode : "",
      quantity: line.quantity != null ? Number(line.quantity) : undefined,
      item_uom_id: line.item_uom_id != null ? Number(line.item_uom_id) : PI_BASE_UOM,
      warehouse_id: line.warehouse_id != null ? Number(line.warehouse_id) : undefined,
      lot_id: line.lot_id != null ? Number(line.lot_id) : undefined,
      lot_number:
        line.lot && typeof line.lot === "object" && line.lot.lot_number != null
          ? String(line.lot.lot_number)
          : undefined,
      expiry_date:
        line.lot && typeof line.lot === "object" && typeof line.lot.expiry_date === "string"
          ? line.lot.expiry_date
          : undefined,
      unit_price: line.unit_price != null ? Number(line.unit_price) : undefined,
      discount_percent: line.discount_percent != null ? Number(line.discount_percent) : 0,
      description: typeof line.description === "string" ? line.description : "",
      notes: typeof line.notes === "string" ? line.notes : "",
      goods_receipt_line_id: line.goods_receipt_line_id ?? undefined,
      grn_quantity: line.grn_quantity != null ? Number(line.grn_quantity) : undefined,
      grn_unit_cost: line.grn_unit_cost != null ? Number(line.grn_unit_cost) : undefined,
      purchase_order_line_id: line.purchase_order_line_id ?? undefined,
      po_quantity: line.po_quantity != null ? Number(line.po_quantity) : undefined,
      po_unit_price: line.po_unit_price != null ? Number(line.po_unit_price) : undefined,
      qty_mismatch: Boolean(line.qty_mismatch),
      price_mismatch: Boolean(line.price_mismatch),
      conversion_factor: line.conversion_factor,
      tax_rate: line.tax_rate,
      vat_percentage: line.item?.vat_group?.percentage,
      discount_amount: line.discount_amount,
      line_subtotal: line.line_subtotal,
      tax_amount: line.tax_amount,
      line_total: line.line_total,
      track_inventory: Boolean(line.item?.track_inventory),
      track_lots: Boolean(line.item?.track_lots),
    };
    return withPurchaseInvoiceLineMismatchFlags(row);
  });
}

/**
 * GRN unit costs are in the primary currency; lines get them × the document rate.
 *
 * @param {Record<string, unknown>} grn
 * @param {{ rate?: number | null; priceDecimals?: number }} [pricing]
 * @returns {PurchaseInvoiceLineFormRow[]}
 */
export function seedLinesFromGoodsReceipt(grn, pricing = {}) {
  const headerWarehouse =
    grn.warehouse_id != null ? Number(grn.warehouse_id) : undefined;
  const grnLines = Array.isArray(grn.lines) ? grn.lines : [];
  if (grnLines.length === 0) return [getEmptyPurchaseInvoiceLine()];
  return grnLines.map((grnLine) => {
    const lot =
      grnLine.lot && typeof grnLine.lot === "object"
        ? /** @type {Record<string, unknown>} */ (grnLine.lot)
        : null;
    const row = {
      ...getEmptyPurchaseInvoiceLine(),
      goods_receipt_line_id: grnLine.id,
      item_id: normalizeEntityId(grnLine.item_id) ?? undefined,
      item_label: purchaseInvoiceItemCodeLabel(
        grnLine.item && typeof grnLine.item === "object"
          ? /** @type {{ item_code?: unknown; name?: unknown; id?: unknown }} */ (grnLine.item)
          : { id: grnLine.item_id },
      ),
      quantity: grnLine.quantity != null ? Number(grnLine.quantity) : undefined,
      grn_quantity: grnLine.quantity != null ? Number(grnLine.quantity) : undefined,
      ...linePriceFromPrimary(grnLine.unit_cost, pricing.rate ?? 1, pricing.priceDecimals ?? 2, "document"),
      grn_unit_cost: grnLine.unit_cost != null ? Number(grnLine.unit_cost) : undefined,
      item_uom_id: grnLine.item_uom_id != null ? Number(grnLine.item_uom_id) : PI_BASE_UOM,
      warehouse_id: headerWarehouse,
      lot_id: grnLine.lot_id != null ? Number(grnLine.lot_id) : undefined,
      lot_number: lot?.lot_number != null ? String(lot.lot_number) : undefined,
      expiry_date: typeof lot?.expiry_date === "string" ? lot.expiry_date : undefined,
      conversion_factor: grnLine.item_uom?.conversion_factor ?? 1,
      track_inventory: Boolean(grnLine.item?.track_inventory),
      track_lots: Boolean(grnLine.item?.track_lots),
      description: purchaseInvoiceItemDescription(
        grnLine.item && typeof grnLine.item === "object" ? grnLine.item : null,
      ),
    };
    return withPurchaseInvoiceLineMismatchFlags(row);
  });
}

/**
 * PO unit prices are in the primary currency; lines get them × the document rate.
 *
 * @param {Record<string, unknown>} order
 * @param {{ rate?: number | null; priceDecimals?: number }} [pricing]
 * @returns {PurchaseInvoiceLineFormRow[]}
 */
export function seedLinesFromPurchaseOrder(order, pricing = {}) {
  const headerWarehouse = order.warehouse_id != null ? Number(order.warehouse_id) : undefined;
  const orderLines = Array.isArray(order.lines) ? order.lines : [];
  if (orderLines.length === 0) return [getEmptyPurchaseInvoiceLine()];
  return orderLines.map((orderLine) => {
    const row = {
      ...getEmptyPurchaseInvoiceLine(),
      purchase_order_line_id: orderLine.id,
      item_id: normalizeEntityId(orderLine.item_id) ?? undefined,
      item_label: purchaseInvoiceItemCodeLabel(
        orderLine.item && typeof orderLine.item === "object"
          ? /** @type {{ item_code?: unknown; name?: unknown; id?: unknown }} */ (orderLine.item)
          : { id: orderLine.item_id },
      ),
      quantity: orderLine.quantity != null ? Number(orderLine.quantity) : undefined,
      po_quantity: orderLine.quantity != null ? Number(orderLine.quantity) : undefined,
      ...linePriceFromPrimary(orderLine.unit_price, pricing.rate ?? 1, pricing.priceDecimals ?? 2, "document"),
      po_unit_price: orderLine.unit_price != null ? Number(orderLine.unit_price) : undefined,
      item_uom_id: orderLine.item_uom_id != null ? Number(orderLine.item_uom_id) : PI_BASE_UOM,
      warehouse_id: headerWarehouse,
      conversion_factor: orderLine.item_uom?.conversion_factor ?? 1,
      track_inventory: Boolean(orderLine.item?.track_inventory),
      track_lots: Boolean(orderLine.item?.track_lots),
      description: purchaseInvoiceItemDescription(
        orderLine.item && typeof orderLine.item === "object" ? orderLine.item : null,
      ),
    };
    return withPurchaseInvoiceLineMismatchFlags(row);
  });
}

/**
 * @param {PurchaseInvoiceLineFormRow | null | undefined} line
 */
export function purchaseInvoiceLineHasUnitPrice(line) {
  if (line == null || line.unit_price == null || line.unit_price === "") return false;
  const price = Number(line.unit_price);
  return Number.isFinite(price) && price >= 0;
}

/**
 * @param {PurchaseInvoiceLineFormRow[]} lines
 */
export function getValidPurchaseInvoiceLines(lines) {
  return lines.filter(isPurchaseInvoiceLineComplete).map((line) => {
    /** @type {Record<string, unknown>} */
    const row = {
      item_id: String(line.item_id),
      quantity: Number(line.quantity),
      unit_price: Number(line.unit_price),
    };
    if (line.goods_receipt_line_id != null && line.goods_receipt_line_id !== "") {
      row.goods_receipt_line_id = Number(line.goods_receipt_line_id);
    }
    if (line.purchase_order_line_id != null && line.purchase_order_line_id !== "") {
      row.purchase_order_line_id = Number(line.purchase_order_line_id);
    }
    if (line.item_uom_id != null && line.item_uom_id !== PI_BASE_UOM) {
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
 * @param {PurchaseInvoiceLineFormRow} line
 */
export function isPurchaseInvoiceLineComplete(line) {
  if (
    line.item_id == null ||
    line.item_id === "" ||
    line.quantity == null ||
    line.quantity === "" ||
    !Number.isFinite(Number(line.quantity)) ||
    Number(line.quantity) <= 0 ||
    !purchaseInvoiceLineHasUnitPrice(line)
  ) {
    return false;
  }
  const grnLinked = line.goods_receipt_line_id != null && line.goods_receipt_line_id !== "";
  if (line.track_inventory && (line.warehouse_id == null || line.warehouse_id === "")) {
    return false;
  }
  if (line.track_lots && !grnLinked && (line.lot_id == null || line.lot_id === "")) {
    return false;
  }
  if (line.track_lots && grnLinked && line.lot_id == null && !line.lot_number) {
    return false;
  }
  return true;
}

/**
 * @param {PurchaseInvoiceLineFormRow | null | undefined} line
 */
export function isPurchaseInvoiceLineEmpty(line) {
  if (!line || typeof line !== "object") return true;
  if (line.goods_receipt_line_id != null && String(line.goods_receipt_line_id).trim() !== "") return false;
  if (line.purchase_order_line_id != null && String(line.purchase_order_line_id).trim() !== "") return false;
  if (line.item_id != null && String(line.item_id).trim() !== "") return false;
  if (typeof line.barcode === "string" && line.barcode.trim() !== "") return false;
  if (typeof line.item_label === "string" && line.item_label.trim() !== "") return false;
  if (line.quantity != null && line.quantity !== "" && Number(line.quantity) !== 0) return false;
  if (line.unit_price != null && line.unit_price !== "") return false;
  if (line.discount_percent != null && Number(line.discount_percent) !== 0) return false;
  if (line.warehouse_id != null && line.warehouse_id !== "") return false;
  if (line.lot_id != null && line.lot_id !== "") return false;
  if (typeof line.description === "string" && line.description.trim() !== "") return false;
  if (typeof line.notes === "string" && line.notes.trim() !== "") return false;
  return true;
}

/**
 * @param {PurchaseInvoiceLineFormRow} row
 * @param {{ item?: Record<string, unknown>; item_uom?: Record<string, unknown> } | null | undefined} result
 * @param {string} scannedBarcode
 * @param {number | undefined} headerWarehouseId
 * @param {{ incrementQuantity?: boolean; rate?: number | null; priceDecimals?: number }} [options]
 */
export function purchaseInvoiceLinePatchFromBarcodeLookup(
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
  const description = purchaseInvoiceItemDescription(item);
  const incrementQuantity = Boolean(options.incrementQuantity);
  const unitCost = purchaseUomUnitCost(itemUom ?? {});
  return {
    barcode: scannedBarcode,
    item_id: itemId,
    item_label: purchaseInvoiceItemCodeLabel(item),
    item_uom_id: itemUom?.id != null ? Number(itemUom.id) : PI_BASE_UOM,
    conversion_factor: itemUom?.conversion_factor != null ? itemUom.conversion_factor : 1,
    ...linePriceFromPrimary(unitCost, options.rate ?? 1, options.priceDecimals ?? 2),
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
    discount_percent: incrementQuantity ? row.discount_percent ?? 0 : 0,
    tax_rate: undefined,
    line_total: undefined,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} picked
 * @param {number | undefined} headerWarehouseId
 */
export function purchaseInvoiceLinePatchFromItemPick(picked, headerWarehouseId) {
  if (!picked || picked.value == null || picked.value === "") {
    return {
      item_id: undefined,
      item_label: "",
      barcode: "",
      item_uom_id: PI_BASE_UOM,
      lot_id: undefined,
      lot_number: undefined,
      expiry_date: undefined,
      warehouse_id: undefined,
      unit_price: undefined,
      ...UNTRACKED_LINE_PRICE,
      conversion_factor: 1,
      track_inventory: false,
      track_lots: false,
      vat_percentage: 0,
      tax_rate: undefined,
      line_total: undefined,
      discount_percent: 0,
      description: "",
      catalogReloadKey: 0,
      goods_receipt_line_id: undefined,
      grn_quantity: undefined,
      grn_unit_cost: undefined,
      purchase_order_line_id: undefined,
      po_quantity: undefined,
      po_unit_price: undefined,
      qty_mismatch: false,
      price_mismatch: false,
    };
  }
  const trackInventory = Boolean(picked.track_inventory);
  return {
    item_id: String(picked.value),
    item_label: String(picked.label ?? ""),
    barcode: "",
    item_uom_id: PI_BASE_UOM,
    lot_id: undefined,
    lot_number: undefined,
    expiry_date: undefined,
    warehouse_id: trackInventory ? headerWarehouseId : undefined,
    unit_price: undefined,
    ...UNTRACKED_LINE_PRICE,
    conversion_factor: 1,
    track_inventory: trackInventory,
    track_lots: Boolean(picked.track_lots),
    vat_percentage: picked.vat_percentage ?? 0,
    tax_rate: undefined,
    line_total: undefined,
    discount_percent: 0,
    description: purchaseInvoiceItemDescription(picked),
    catalogReloadKey: 0,
    goods_receipt_line_id: undefined,
    grn_quantity: undefined,
    grn_unit_cost: undefined,
    purchase_order_line_id: undefined,
    po_quantity: undefined,
    po_unit_price: undefined,
    qty_mismatch: false,
    price_mismatch: false,
  };
}

/**
 * @param {PurchaseInvoiceLineFormRow[]} lines
 */
export function canAddPurchaseInvoiceLine(lines) {
  return lines.length === 0 || lines.every(isPurchaseInvoiceLineComplete);
}

function serializePurchaseInvoiceLines(current) {
  return JSON.stringify(
    getValidPurchaseInvoiceLines(current).map((row) => ({
      item_id: row.item_id,
      goods_receipt_line_id: row.goods_receipt_line_id ?? null,
      purchase_order_line_id: row.purchase_order_line_id ?? null,
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
 * @param {PurchaseInvoiceLineFormRow[]} current
 * @param {PurchaseInvoiceLineFormRow[]} initial
 */
export function arePurchaseInvoiceLinesDirty(current, initial) {
  return serializePurchaseInvoiceLines(current) !== serializePurchaseInvoiceLines(initial);
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
 * @param {import("antd").FormInstance} form
 * @param {ReturnType<typeof getPurchaseInvoiceDefaults>} baseline
 */
export function isPurchaseInvoiceHeaderDirtyVsBaseline(form, baseline) {
  const values = form.getFieldsValue(true);
  const keys = [
    "supplier_id",
    "goods_receipt_id",
    "purchase_order_id",
    "warehouse_id",
    "currency_id",
    "payment_method_id",
    "payment_terms_id",
  ];
  for (const key of keys) {
    if (!sameLookupId(values[key], baseline[key])) return true;
  }
  if (toIsoDate(values.invoice_date) !== toIsoDate(baseline.invoice_date)) return true;
  if (toIsoDate(values.due_on) !== toIsoDate(baseline.due_on)) return true;
  if (String(values.reference_2 ?? "").trim() !== String(baseline.reference_2 ?? "").trim()) return true;
  const linkedProofId = values.use_linked_proof ? String(values.linked_proof_id ?? "").trim() : "";
  const baselineLinkedProofId = baseline.use_linked_proof ? String(baseline.linked_proof_id ?? "").trim() : "";
  if (linkedProofId !== baselineLinkedProofId) return true;
  if (String(values.notes ?? "").trim() !== String(baseline.notes ?? "").trim()) return true;
  if (Number(values.adjustment ?? 0) !== Number(baseline.adjustment ?? 0)) return true;
  if (Number(values.exchange_rate ?? 1) !== Number(baseline.exchange_rate ?? 1)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} values
 */
export function purchaseInvoiceHeaderRequiredFieldsValid(values) {
  return values.supplier_id != null && values.warehouse_id != null && values.invoice_date != null;
}

/**
 * @param {Record<string, unknown>} values
 * @param {PurchaseInvoiceLineFormRow[]} lines
 */
export function canSavePurchaseInvoiceDraft(values, lines) {
  if (!purchaseInvoiceHeaderRequiredFieldsValid(values)) return false;
  const candidates = lines.filter(
    (line) =>
      line.item_id != null &&
      line.item_id !== "" &&
      line.quantity != null &&
      Number(line.quantity) > 0,
  );
  if (candidates.length === 0) return false;
  return candidates.every(isPurchaseInvoiceLineComplete);
}

/**
 * @param {Record<string, unknown>} values
 * @param {Record<string, unknown> | null} [disclosure]
 */
export function purchaseInvoiceHeaderToPayload(values, disclosure = null) {
  const grnId = values.goods_receipt_id;
  const poId = values.purchase_order_id;
  return {
    supplier_id: values.supplier_id,
    goods_receipt_id: grnId != null && grnId !== "" ? grnId : null,
    purchase_order_id: poId != null && poId !== "" ? poId : null,
    warehouse_id: values.warehouse_id,
    currency_id: values.currency_id,
    payment_method_id: values.payment_method_id ?? null,
    payment_terms_id: values.payment_terms_id ?? null,
    invoice_date: toIsoDate(values.invoice_date),
    due_on: toIsoDate(values.due_on),
    exchange_rate:
      values.exchange_rate != null && values.exchange_rate !== "" ? Number(values.exchange_rate) : null,
    reference_2:
      typeof values.reference_2 === "string" && values.reference_2.trim() ? values.reference_2.trim() : null,
    linked_proof_id: values.use_linked_proof
      ? (typeof values.linked_proof_id === "string" && values.linked_proof_id.trim()
          ? values.linked_proof_id.trim()
          : null)
      : null,
    adjustment: values.adjustment != null ? Number(values.adjustment) : 0,
    notes: typeof values.notes === "string" && values.notes.trim() ? values.notes.trim() : null,
    ...(values.use_linked_proof && disclosure ? { disclosure } : {}),
  };
}

/**
 * @param {Record<string, unknown>} values
 * @param {PurchaseInvoiceLineFormRow[]} lines
 * @param {Record<string, unknown> | null} [disclosure]
 */
export function purchaseInvoiceCreatePayload(values, lines, disclosure = null) {
  return {
    ...purchaseInvoiceHeaderToPayload(values, disclosure),
    lines: getValidPurchaseInvoiceLines(lines),
  };
}
