/** @type {readonly string[]} */
export const STOCK_MOVEMENT_TYPE_VALUES = [
  "adjustment",
  "opening",
  "sale",
  "purchase",
  "transfer_in",
  "transfer_out",
  "transfer_return",
  "production_in",
  "production_out",
  "bundle_sale",
  "count",
];

/**
 * @param {(key: string) => string} t `useTranslations("Stock")`
 * @param {string | null | undefined} type
 * @returns {string}
 */
export function getStockMovementTypeLabel(t, type) {
  const key = typeof type === "string" ? type.trim() : "";
  if (!key) return "—";
  return t(`movementType_${key}`);
}
