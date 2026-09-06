/**
 * Client preview of invoice tax, matching backend DocumentTaxMath / DocumentTaxContext.
 */

/**
 * @param {unknown} value
 * @param {number} scale
 */
function toDecimal(value, scale) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(scale));
}

/**
 * @param {unknown} value
 */
function clampPercent(value) {
  let n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) n = 0;
  if (n > 100) n = 100;
  return n;
}

/**
 * @param {number} value
 * @param {number} scale
 * @param {string} [mode]
 */
export function roundMoney(value, scale = 2, mode = "half_up") {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const places = Math.max(0, Math.min(6, Number(scale) || 0));
  const factor = 10 ** places;
  let rounded;
  if (mode === "up") {
    rounded = n >= 0 ? Math.ceil(n * factor - 1e-12) / factor : Math.floor(n * factor + 1e-12) / factor;
  } else if (mode === "down") {
    rounded = n >= 0 ? Math.floor(n * factor + 1e-12) / factor : Math.ceil(n * factor - 1e-12) / factor;
  } else if (mode === "half_even") {
    const scaled = n * factor;
    const nearest = Math.round(scaled);
    const diff = Math.abs(Math.abs(scaled) - Math.abs(nearest));
    if (Math.abs(Math.abs(scaled) - Math.floor(Math.abs(scaled)) - 0.5) < 1e-8) {
      const floored = Math.trunc(scaled);
      const isHalf = Math.abs(scaled - floored - Math.sign(scaled || 1) * 0.5) < 1e-8 ||
        Math.abs(scaled - floored + (n < 0 ? 0.5 : -0.5)) < 1e-8;
      if (isHalf || diff < 1e-8) {
        const absFloor = Math.floor(Math.abs(scaled) + 1e-12);
        const even = absFloor % 2 === 0 ? absFloor : absFloor + 1;
        rounded = (n < 0 ? -even : even) / factor;
      } else {
        rounded = nearest / factor;
      }
    } else {
      rounded = nearest / factor;
    }
  } else {
    const sign = n < 0 ? -1 : 1;
    rounded = (sign * Math.floor(Math.abs(n) * factor + 0.5 + 1e-10)) / factor;
  }
  return Number(rounded.toFixed(places));
}

/**
 * @param {{ priceDecimalPlaces?: number; priceRoundingMode?: string } | null | undefined} settings
 */
function moneyScale(settings) {
  return Math.max(0, Math.min(6, Number(settings?.priceDecimalPlaces ?? 2)));
}

/**
 * @param {unknown} value
 * @param {{ priceDecimalPlaces?: number; priceRoundingMode?: string } | null | undefined} settings
 */
function money(value, settings) {
  return roundMoney(value, moneyScale(settings), settings?.priceRoundingMode ?? "half_up");
}

/**
 * VAT % from an item names/detail row.
 * @param {Record<string, unknown> | null | undefined} item
 * @returns {number | null}
 */
export function itemVatPercentage(item) {
  if (!item || typeof item !== "object") return null;
  const group = item.vat_group;
  if (group && typeof group === "object" && group.percentage != null && group.percentage !== "") {
    const n = Number(group.percentage);
    return Number.isFinite(n) ? n : null;
  }
  if (item.vat_percentage != null && item.vat_percentage !== "") {
    const n = Number(item.vat_percentage);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} customer
 * @param {unknown} documentDate
 */
export function customerIsExemptOnDate(customer, documentDate) {
  if (!customer || !customer.is_exempted) return false;
  const date = toDateOnly(documentDate);
  if (!date) return Boolean(customer.is_exempted);
  const from = toDateOnly(customer.exempted_from);
  const to = toDateOnly(customer.exempted_to);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function toDateOnly(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (typeof value?.format === "function") return value.format("YYYY-MM-DD");
  return null;
}

/**
 * @param {{
 *   taxEnabled?: boolean;
 *   customerExempt?: boolean;
 *   vatPercentage?: unknown;
 * }} args
 */
export function taxRatePercentForItem({ taxEnabled = true, customerExempt = false, vatPercentage } = {}) {
  if (!taxEnabled || customerExempt) return 0;
  return clampPercent(vatPercentage ?? 0);
}

/**
 * Line money after qty × price, optional disc%, then tax.
 *
 * @param {unknown} quantity
 * @param {unknown} unitPrice
 * @param {unknown} discountPercent
 * @param {unknown} taxRatePercent
 * @param {boolean} pricesIncludeTax
 * @param {{ priceDecimalPlaces?: number; priceRoundingMode?: string } | null | undefined} settings
 */
export function computeDocumentLine(
  quantity,
  unitPrice,
  discountPercent,
  taxRatePercent,
  pricesIncludeTax,
  settings = null,
) {
  const scale = moneyScale(settings);
  const qty = Number(quantity);
  const price = toDecimal(unitPrice, scale);
  const discPct = clampPercent(discountPercent);
  const rate = clampPercent(taxRatePercent);
  const safeQty = Number.isFinite(qty) ? qty : 0;

  const merchandiseRaw = safeQty * price;
  const merchandise = money(merchandiseRaw, settings);
  const discountAmount = money(merchandiseRaw * (discPct / 100), settings);
  let afterDiscount = merchandiseRaw - discountAmount;
  if (afterDiscount < 0) afterDiscount = 0;

  if (pricesIncludeTax && rate > 0) {
    const divisor = 1 + rate / 100;
    const net = afterDiscount / divisor;
    const tax = afterDiscount - net;
    return {
      merchandise,
      discount_amount: discountAmount,
      line_subtotal: money(net, settings),
      tax_amount: money(tax, settings),
      line_total: money(afterDiscount, settings),
      tax_rate: rate,
    };
  }

  const lineSubtotal = money(afterDiscount, settings);
  const taxAmount = money(lineSubtotal * (rate / 100), settings);
  return {
    merchandise,
    discount_amount: discountAmount,
    line_subtotal: lineSubtotal,
    tax_amount: taxAmount,
    line_total: money(lineSubtotal + taxAmount, settings),
    tax_rate: rate,
  };
}

/**
 * @param {Array<{ merchandise?: unknown; discount_amount?: unknown; tax_amount?: unknown }>} lines
 * @param {unknown} adjustment
 * @param {boolean} pricesIncludeTax
 * @param {{ priceDecimalPlaces?: number; priceRoundingMode?: string } | null | undefined} settings
 */
export function sumDocumentTotals(lines, adjustment, pricesIncludeTax, settings = null) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  for (const line of lines ?? []) {
    subtotal += Number(line.merchandise ?? 0) || 0;
    discountTotal += Number(line.discount_amount ?? 0) || 0;
    taxTotal += Number(line.tax_amount ?? 0) || 0;
  }
  subtotal = money(subtotal, settings);
  discountTotal = money(discountTotal, settings);
  taxTotal = money(taxTotal, settings);
  const adjustmentMoney = money(adjustment ?? 0, settings);
  let base = subtotal - discountTotal;
  if (!pricesIncludeTax) base += taxTotal;
  const grandTotal = money(base + adjustmentMoney, settings);
  return {
    subtotal,
    discount_total: discountTotal,
    tax_total: taxTotal,
    grand_total: grandTotal,
    net_to_pay: grandTotal,
  };
}

/**
 * @param {import("./salesInvoiceDrawerUtils").SalesInvoiceLineFormRow} row
 * @param {{ vat_percentage?: unknown } | null | undefined} itemOption
 * @param {Record<string, unknown> | null | undefined} catalogItem
 */
export function resolveLineVatPercentage(row, itemOption, catalogItem) {
  if (itemOption?.vat_percentage != null && itemOption.vat_percentage !== "") {
    const n = Number(itemOption.vat_percentage);
    if (Number.isFinite(n)) return n;
  }
  if (row?.vat_percentage != null && row.vat_percentage !== "") {
    const n = Number(row.vat_percentage);
    if (Number.isFinite(n)) return n;
  }
  const fromItem = itemVatPercentage(catalogItem);
  if (fromItem != null) return fromItem;
  return null;
}

/**
 * Live tax % for a draft line. Null when the line has no item yet.
 *
 * @param {{
 *   row: import("./salesInvoiceDrawerUtils").SalesInvoiceLineFormRow;
 *   itemOption?: { vat_percentage?: unknown } | null;
 *   catalogItem?: Record<string, unknown> | null;
 *   taxEnabled: boolean;
 *   customerExempt: boolean;
 * }} args
 * @returns {number | null}
 */
export function previewLineTaxRate({ row, itemOption, catalogItem, taxEnabled, customerExempt }) {
  if (row?.item_id == null || row.item_id === "") return null;
  const vat = resolveLineVatPercentage(row, itemOption, catalogItem);
  if (vat != null) {
    return taxRatePercentForItem({ taxEnabled, customerExempt, vatPercentage: vat });
  }
  if (row.tax_rate != null && row.tax_rate !== "") {
    const stored = Number(row.tax_rate);
    return Number.isFinite(stored) ? stored : 0;
  }
  return 0;
}

/**
 * Live line total when qty and price are present.
 *
 * @param {{
 *   row: import("./salesInvoiceDrawerUtils").SalesInvoiceLineFormRow;
 *   taxRate: number | null;
 *   pricesIncludeTax: boolean;
 *   settings?: { priceDecimalPlaces?: number; priceRoundingMode?: string } | null;
 * }} args
 */
export function previewLineAmounts({ row, taxRate, pricesIncludeTax, settings }) {
  if (taxRate == null) return null;
  if (row?.quantity == null || row.quantity === "" || row.unit_price == null || row.unit_price === "") {
    return null;
  }
  const qty = Number(row.quantity);
  const price = Number(row.unit_price);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return null;
  return computeDocumentLine(qty, price, row.discount_percent ?? 0, taxRate, pricesIncludeTax, settings);
}

/**
 * @param {{
 *   lines: import("./salesInvoiceDrawerUtils").SalesInvoiceLineFormRow[];
 *   itemsById: Map<string, Record<string, unknown>>;
 *   adjustment?: unknown;
 *   taxEnabled: boolean;
 *   pricesIncludeTax: boolean;
 *   customerExempt: boolean;
 *   settings?: { priceDecimalPlaces?: number; priceRoundingMode?: string } | null;
 * }} args
 */
export function previewInvoiceTotals({
  lines,
  itemsById,
  adjustment = 0,
  taxEnabled,
  pricesIncludeTax,
  customerExempt,
  settings,
}) {
  const mathLines = [];
  for (const row of lines ?? []) {
    const taxRate = previewLineTaxRate({
      row,
      catalogItem: row.item_id != null ? itemsById.get(String(row.item_id)) ?? null : null,
      taxEnabled,
      customerExempt,
    });
    const amounts = previewLineAmounts({ row, taxRate, pricesIncludeTax, settings });
    if (!amounts) continue;
    mathLines.push(amounts);
  }
  return sumDocumentTotals(mathLines, adjustment, pricesIncludeTax, settings);
}
