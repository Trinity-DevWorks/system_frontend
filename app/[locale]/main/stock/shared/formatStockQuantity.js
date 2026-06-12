/**
 * @param {unknown} value
 * @param {number} [maxDecimals]
 * @returns {string}
 */
export function formatStockQuantity(value, maxDecimals = 6) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const fixed = n.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, "") || "0";
}

/**
 * @param {{ code?: string; name?: string } | null | undefined} uom
 * @returns {string}
 */
export function formatUomLabel(uom) {
  if (!uom) return "";
  const code = typeof uom.code === "string" ? uom.code.trim() : "";
  const name = typeof uom.name === "string" ? uom.name.trim() : "";
  if (code && name) return `${code} — ${name}`;
  return code || name || "";
}
