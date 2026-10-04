"use client";

import { useCompanySettings } from "@/lib/company-settings";
import {
  formatTenantGroupedInput,
  parseTenantGroupedInput,
  tenantDecimalStep,
} from "@/lib/tenant-format";
import { EXCHANGE_RATE_DECIMALS } from "@/lib/currency/documentExchangeRate";
import { InputNumber } from "antd";

/**
 * @typedef {"money" | "quantity" | "percent" | "rate" | "integer"} TenantNumberKind
 */

/**
 * @param {TenantNumberKind} kind
 * @param {import("@/lib/company-settings").CompanySettings} settings
 * @returns {number}
 */
function decimalsForKind(kind, settings) {
  if (kind === "money") return settings.priceDecimalPlaces;
  if (kind === "percent") return 2;
  if (kind === "rate") return EXCHANGE_RATE_DECIMALS;
  if (kind === "integer") return 0;
  return 6;
}

/**
 * Rates keep 12 decimals (1 primary = rate × currency) but display without padding zeros.
 *
 * @param {string | number | undefined} value
 * @param {{ userTyping: boolean; input: string }} info
 */
function formatRateInput(value, info) {
  if (info?.userTyping) return info.input;
  if (value === undefined || value === null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return formatTenantGroupedInput(value);
  const fixed = n.toFixed(EXCHANGE_RATE_DECIMALS);
  const trimmed = fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
  return formatTenantGroupedInput(trimmed);
}

/**
 * InputNumber that applies company number format (and price decimals for money).
 *
 * @param {{
 *   kind?: TenantNumberKind,
 *   decimals?: number,
 *   step?: number,
 *   [key: string]: unknown,
 * }} props
 */
export default function TenantNumberInput({
  kind = "quantity",
  decimals,
  step,
  precision: _precision,
  formatter,
  parser,
  ...rest
}) {
  const { settings } = useCompanySettings();
  const places = decimals ?? decimalsForKind(kind, settings);
  const trimRate = kind === "rate" && decimals == null;

  return (
    <InputNumber
      {...rest}
      precision={trimRate ? undefined : places}
      step={step ?? (trimRate ? 0.0001 : tenantDecimalStep(places))}
      formatter={formatter ?? (trimRate ? formatRateInput : formatTenantGroupedInput)}
      parser={parser ?? parseTenantGroupedInput}
    />
  );
}
