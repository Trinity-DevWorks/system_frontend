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
 * @returns {{ thousands: string, decimal: string }}
 */
export function tenantNumberSeparators(settings = getTenantFormatSettings()) {
  return NUMBER_SEPARATORS[settings.numberFormat] ?? NUMBER_SEPARATORS.comma_dot;
}

/**
 * @param {number} decimals
 * @returns {number}
 */
export function tenantDecimalStep(decimals) {
  const places = Math.max(0, decimals);
  if (places === 0) return 1;
  return Number(`${1}e-${places}`);
}

/**
 * Canonical money string for dirty fingerprints (matches input precision).
 *
 * @param {string | number | null | undefined} value
 * @param {import("@/lib/company-settings").CompanySettings} [settings]
 * @returns {string}
 */
export function tenantMoneyFixed(value, settings = getTenantFormatSettings()) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return Number(0).toFixed(settings.priceDecimalPlaces);
  return n.toFixed(settings.priceDecimalPlaces);
}

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
 * Group thousands while typing (InputNumber formatter). Value uses `.` as decimal.
 *
 * @param {string | number | undefined} value
 * @returns {string}
 */
export function formatTenantGroupedInput(value) {
  if (value === undefined || value === null || value === "") return "";
  const { thousands, decimal } = tenantNumberSeparators();
  let str = String(value);
  const negative = str.startsWith("-");
  if (negative) str = str.slice(1);

  const dot = str.indexOf(".");
  const intPart = dot === -1 ? str : str.slice(0, dot);
  const fracPart = dot === -1 ? null : str.slice(dot + 1);
  const intGrouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

  let body = intGrouped;
  if (fracPart !== null) {
    body = `${intGrouped}${decimal}${fracPart}`;
  }
  return negative ? `-${body}` : body;
}

/**
 * Strip tenant grouping so InputNumber can parse a `.` decimal string.
 *
 * @param {string | undefined} display
 * @returns {string}
 */
export function parseTenantGroupedInput(display) {
  if (display == null || display === "") return "";
  const { thousands, decimal } = tenantNumberSeparators();
  let s = String(display);
  if (thousands === " ") {
    s = s.replace(/\s/g, "");
  } else if (thousands) {
    s = s.split(thousands).join("");
  }
  s = s.replace(/\s/g, "");
  if (decimal !== ".") {
    const idx = s.lastIndexOf(decimal);
    if (idx !== -1) {
      s = `${s.slice(0, idx).split(decimal).join("")}.${s.slice(idx + decimal.length)}`;
    }
  }
  return s;
}

/**
 * Format a picked dayjs calendar date for filter chips (no timezone shift).
 *
 * @param {import("dayjs").Dayjs | null | undefined} from
 * @param {import("dayjs").Dayjs | null | undefined} to
 * @returns {string | null}
 */
export function formatTenantDateRangeLabel(from, to) {
  if (!from && !to) return null;
  const fmt = (/** @type {import("dayjs").Dayjs} */ d) =>
    d.format(dayjsDatePattern());
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return fmt(from);
  return fmt(/** @type {import("dayjs").Dayjs} */ (to));
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
