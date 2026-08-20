/**
 * Edge formatters for tenant display prefs.
 * API/DB stay ISO/UTC — format only here (UI / exports).
 */

import dayjs from "@/lib/dayjs";
import { getTenantFormatSettings } from "@/lib/tenant-format-runtime";

/** @type {Record<import("@/lib/company-settings").DateFormat, string>} */
const DATE_FORMAT_TO_DAYJS = {
  "Y-m-d": "YYYY-MM-DD",
  "d/m/Y": "DD/MM/YYYY",
  "m/d/Y": "MM/DD/YYYY",
  "d-m-Y": "DD-MM-YYYY",
  "d.m.Y": "DD.MM.YYYY",
};

/** @type {Record<import("@/lib/company-settings").NumberFormat, { thousands: string, decimal: string }>} */
const NUMBER_SEPARATORS = {
  comma_dot: { thousands: ",", decimal: "." },
  dot_comma: { thousands: ".", decimal: "," },
  space_dot: { thousands: " ", decimal: "." },
  space_comma: { thousands: " ", decimal: "," },
};

/**
 * @param {import("@/lib/company-settings").CompanySettings} [settings]
 * @returns {string}
 */
export function dayjsDatePattern(settings = getTenantFormatSettings()) {
  return DATE_FORMAT_TO_DAYJS[settings.dateFormat] ?? "YYYY-MM-DD";
}

/**
 * @param {import("@/lib/company-settings").CompanySettings} [settings]
 * @returns {string}
 */
export function dayjsDateTimePattern(settings = getTenantFormatSettings()) {
  return `${dayjsDatePattern(settings)} HH:mm`;
}

/**
 * Calendar date only (no timezone shift) — for `Y-m-d` API fields.
 * Datetime ISO strings use tenant timezone.
 *
 * @param {string | Date | number | null | undefined} value
 * @param {import("@/lib/company-settings").CompanySettings} [settings]
 * @returns {string}
 */
export function formatTenantDate(value, settings = getTenantFormatSettings()) {
  if (value == null || value === "") return "";

  if (isDateOnlyString(value)) {
    const d = dayjs(value, "YYYY-MM-DD", true);
    if (!d.isValid()) return "";
    return d.format(dayjsDatePattern(settings));
  }

  const d = toTenantDayjs(value, settings.timezone);
  if (!d) return "";
  return d.format(dayjsDatePattern(settings));
}

/**
 * Instant → tenant timezone display.
 *
 * @param {string | Date | number | null | undefined} value
 * @param {import("@/lib/company-settings").CompanySettings} [settings]
 * @returns {string}
 */
export function formatTenantDateTime(
  value,
  settings = getTenantFormatSettings(),
) {
  if (value == null || value === "") return "";
  const d = toTenantDayjs(value, settings.timezone);
  if (!d) return "";
  return d.format(dayjsDateTimePattern(settings));
}

/**
 * @param {string | number | null | undefined} value
 * @param {{
 *   decimals?: number,
 *   trimTrailingZeros?: boolean,
 *   settings?: import("@/lib/company-settings").CompanySettings
 * }} [options]
 * @returns {string}
 */
export function formatTenantNumber(value, options = {}) {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return "";

  const settings = options.settings ?? getTenantFormatSettings();
  const decimals =
    options.decimals != null
      ? options.decimals
      : settings.priceDecimalPlaces;
  const { thousands, decimal } =
    NUMBER_SEPARATORS[settings.numberFormat] ?? NUMBER_SEPARATORS.comma_dot;

  const negative = n < 0;
  const abs = Math.abs(n);
  const fixed = abs.toFixed(Math.max(0, decimals));
  const [intRaw, frac = ""] = fixed.split(".");
  const intGrouped = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

  let body;
  if (decimals > 0) {
    const fracPart = options.trimTrailingZeros
      ? frac.replace(/0+$/, "")
      : frac;
    body = fracPart ? `${intGrouped}${decimal}${fracPart}` : intGrouped;
  } else {
    body = intGrouped;
  }

  return negative ? `-${body}` : body;
}

/**
 * Money / price display using tenant decimal places + number format.
 *
 * @param {string | number | null | undefined} value
 * @param {import("@/lib/company-settings").CompanySettings} [settings]
 * @returns {string}
 */
export function formatTenantMoney(value, settings = getTenantFormatSettings()) {
  return formatTenantNumber(value, {
    settings,
    decimals: settings.priceDecimalPlaces,
  });
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isDateOnlyString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * @param {string | Date | number} value
 * @param {string} timezone
 * @returns {import("dayjs").Dayjs | null}
 */
function toTenantDayjs(value, timezone) {
  const parsed = dayjs.utc(value);
  if (!parsed.isValid()) {
    const fallback = dayjs(value);
    if (!fallback.isValid()) return null;
    try {
      return fallback.tz(timezone);
    } catch {
      return fallback;
    }
  }
  try {
    return parsed.tz(timezone);
  } catch {
    return parsed;
  }
}
