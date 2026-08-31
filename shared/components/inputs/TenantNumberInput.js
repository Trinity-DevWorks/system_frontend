"use client";

import { useCompanySettings } from "@/lib/company-settings";
import {
  formatTenantGroupedInput,
  parseTenantGroupedInput,
  tenantDecimalStep,
} from "@/lib/tenant-format";
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
  if (kind === "rate") return 6;
  if (kind === "integer") return 0;
  return 6;
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

  return (
    <InputNumber
      {...rest}
      precision={places}
      step={step ?? tenantDecimalStep(places)}
      formatter={formatter ?? formatTenantGroupedInput}
      parser={parser ?? parseTenantGroupedInput}
    />
  );
}
