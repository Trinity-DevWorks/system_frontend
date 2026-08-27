/**
 * PO expected date = order date + supplier–item lead time.
 * Several lines: use the longest lead time so every item is covered.
 */

import dayjs from "dayjs";

/**
 * @param {unknown} value
 * @returns {number | undefined}
 */
export function parseLeadTimeDays(value) {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.trunc(n);
}

/**
 * @param {unknown[] | undefined | null} rows
 * @returns {Map<string, number>}
 */
export function buildLeadTimeDaysByItemId(rows) {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (const row of rows ?? []) {
    if (row == null || typeof row !== "object") continue;
    const itemId = /** @type {{ item_id?: unknown }} */ (row).item_id;
    if (itemId == null || itemId === "") continue;
    const days = parseLeadTimeDays(/** @type {{ lead_time_days?: unknown }} */ (row).lead_time_days);
    if (days != null) {
      map.set(String(itemId), days);
    }
  }
  return map;
}

/**
 * @param {Array<{ item_id?: unknown }>} lines
 * @param {Map<string, number>} leadTimeByItemId
 * @returns {number | undefined}
 */
export function maxLeadTimeDaysForLines(lines, leadTimeByItemId) {
  /** @type {number | undefined} */
  let max;
  for (const line of lines) {
    if (line?.item_id == null || line.item_id === "") continue;
    const days = leadTimeByItemId.get(String(line.item_id));
    if (days == null) continue;
    max = max == null ? days : Math.max(max, days);
  }
  return max;
}

/**
 * @param {unknown} orderDate
 * @param {number | undefined} leadTimeDays
 * @returns {import("dayjs").Dayjs | undefined}
 */
export function suggestedExpectedDate(orderDate, leadTimeDays) {
  if (leadTimeDays == null || orderDate == null || orderDate === "") return undefined;
  const parsed = dayjs.isDayjs(orderDate) ? orderDate : dayjs(orderDate);
  if (!parsed.isValid()) return undefined;
  return parsed.add(leadTimeDays, "day");
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function expectedDateKey(value) {
  if (value == null || value === "") return "";
  const parsed = dayjs.isDayjs(value) ? value : dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
}
