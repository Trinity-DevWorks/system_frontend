/**
 * Prefill PO unit price from the supplier's last purchase price.
 * Last purchase is stored on the supplier–item link (base UOM).
 */

/**
 * @param {unknown} value
 * @returns {number | undefined}
 */
export function parseLastPurchasePrice(value) {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * @param {unknown[] | undefined | null} rows
 * @returns {Map<string, number>}
 */
export function buildLastPurchasePriceByItemId(rows) {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (const row of rows ?? []) {
    if (row == null || typeof row !== "object") continue;
    const itemId = /** @type {{ item_id?: unknown }} */ (row).item_id;
    if (itemId == null || itemId === "") continue;
    const price = parseLastPurchasePrice(
      /** @type {{ last_purchase_price?: unknown }} */ (row).last_purchase_price,
    );
    if (price != null) {
      map.set(String(itemId), price);
    }
  }
  return map;
}

/**
 * Last purchase prices are stored in the primary currency; show them in the order currency.
 *
 * @param {Map<string, number>} lastPriceByItemId
 * @param {number | null | undefined} rate primary-to-document rate (1 primary = rate document)
 * @param {number} decimals
 * @returns {Map<string, number>}
 */
export function lastPurchasePricesAtRate(lastPriceByItemId, rate, decimals) {
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0 || r === 1) return lastPriceByItemId;
  const factor = 10 ** Math.max(0, decimals);
  /** @type {Map<string, number>} */
  const converted = new Map();
  for (const [itemId, price] of lastPriceByItemId) {
    converted.set(itemId, Math.round(price * r * factor) / factor);
  }
  return converted;
}

/**
 * @param {Map<string, number>} lastPriceByItemId
 * @param {unknown} itemId
 * @returns {number | undefined}
 */
export function suggestedPurchaseOrderUnitPrice(lastPriceByItemId, itemId) {
  if (itemId == null || itemId === "") return undefined;
  return lastPriceByItemId.get(String(itemId));
}

/**
 * @param {import("./purchaseOrderDrawerUtils").PurchaseOrderLineFormRow} line
 * @param {number | undefined} suggested
 * @param {boolean} overwrite
 */
function nextLineWithSuggestedPrice(line, suggested, overwrite) {
  if (overwrite) {
    if (line.unit_price === suggested && Boolean(line.unitPriceAuto) === (suggested != null)) {
      return line;
    }
    return { ...line, unit_price: suggested, unitPriceAuto: suggested != null };
  }

  // Auto-filled prices follow the suggestion (e.g. after the order currency changes); typed prices stay.
  if (line.unitPriceAuto !== true || suggested == null || line.unit_price === suggested) {
    return line;
  }

  return { ...line, unit_price: suggested, unitPriceAuto: true };
}

/**
 * @param {import("./purchaseOrderDrawerUtils").PurchaseOrderLineFormRow[]} lines
 * @param {Map<string, number>} lastPriceByItemId
 * @param {{ overwrite?: boolean }} [options]
 * @returns {import("./purchaseOrderDrawerUtils").PurchaseOrderLineFormRow[]}
 */
export function applySuggestedPurchaseOrderUnitPrices(lines, lastPriceByItemId, options = {}) {
  const overwrite = Boolean(options.overwrite);
  let changed = false;
  const next = lines.map((line) => {
    if (!line.item_id) return line;
    const suggested = suggestedPurchaseOrderUnitPrice(lastPriceByItemId, line.item_id);
    const updated = nextLineWithSuggestedPrice(line, suggested, overwrite);
    if (updated !== line) changed = true;
    return updated;
  });
  return changed ? next : lines;
}
