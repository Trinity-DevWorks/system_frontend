import { formatTenantDate } from "@/lib/tenant-format";
import { formatStockQuantity } from "./formatStockQuantity";

export const STOCK_ADJUSTMENT_NEW_LOT = "__stock_new_lot__";

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
export function expiryDatePayload(value) {
  if (value == null || value === "") return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 10) : undefined;
  }
  if (typeof value === "object" && typeof /** @type {{ format?: unknown }} */ (value).format === "function") {
    return /** @type {{ format: (pattern: string) => string }} */ (value).format("YYYY-MM-DD");
  }
  return undefined;
}

/**
 * Attach expiry_date when creating a new lot (no lot_id, has lot_number).
 * @param {Record<string, unknown>} row
 * @param {{ lot_id?: number; lot_number?: string; expiry_date?: unknown }} line
 */
export function assignNewLotExpiry(row, line) {
  if (line.lot_id != null) return;
  if (!String(line.lot_number ?? "").trim()) return;
  const expiry = expiryDatePayload(line.expiry_date);
  if (expiry) row.expiry_date = expiry;
}

/**
 * @param {Record<string, unknown> | null | undefined} lot
 */
export function formatLotOptionLabel(lot) {
  if (!lot || typeof lot !== "object") return "—";
  const number = typeof lot.lot_number === "string" && lot.lot_number.trim() ? lot.lot_number : `#${lot.id}`;
  return number;
}

/**
 * Hover details for a lot option: expiry and on-hand quantity.
 *
 * @param {Record<string, unknown> | null | undefined} lot
 * @param {(key: string, values?: Record<string, unknown>) => string} t
 */
export function formatLotOptionTooltip(lot, t) {
  if (!lot || typeof lot !== "object") return "";
  const parts = [];
  if (typeof lot.expiry_date === "string" && lot.expiry_date) {
    const date = formatTenantDate(lot.expiry_date) || lot.expiry_date;
    parts.push(t("lotExpiryShort", { date }));
  }
  if (lot.is_expired === true) {
    parts.push(t("lotExpired"));
  }
  if (lot.quantity != null && lot.quantity !== "") {
    parts.push(t("lotOnHandShort", { qty: formatStockQuantity(lot.quantity) }));
  }
  return parts.join(" · ");
}

/**
 * @param {Record<string, unknown> | null | undefined} lot
 */
export function lotNumberLabel(lot) {
  if (!lot || typeof lot !== "object") return null;
  const number = typeof lot.lot_number === "string" ? lot.lot_number.trim() : "";
  return number || null;
}
