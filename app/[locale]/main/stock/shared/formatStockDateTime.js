import dayjs from "@/lib/dayjs";

/** Same date style as category tables (e.g. May 24, 2026) with time. */
export const STOCK_DATETIME_DISPLAY_FORMAT = "MMMM D, YYYY, h:mm A";

/**
 * @param {string | Date | null | undefined} value
 * @returns {string} Formatted label or empty string when invalid/missing.
 */
export function formatStockDateTime(value) {
  if (value == null || value === "") return "";
  const d = dayjs(value);
  if (!d.isValid()) return "";
  return d.format(STOCK_DATETIME_DISPLAY_FORMAT);
}
