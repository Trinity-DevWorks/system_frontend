import { formatTenantNumber } from "@/lib/tenant-format";

/**
 * @param {unknown} value
 * @param {number} [maxDecimals]
 * @returns {string}
 */
export function formatStockQuantity(value, maxDecimals = 6) {
  const formatted = formatTenantNumber(
    typeof value === "number" || typeof value === "string" ? value : Number(value),
    { decimals: maxDecimals, trimTrailingZeros: true },
  );
  return formatted || "—";
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
