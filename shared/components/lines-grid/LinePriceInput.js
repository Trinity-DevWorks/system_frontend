"use client";

import TenantNumberInput from "@/shared/components/inputs/TenantNumberInput";
import { EXCHANGE_RATE_DECIMALS, positiveRate, priceInPrimary } from "@/lib/currency/documentExchangeRate";
import { formatTenantMoney, formatTenantNumber } from "@/lib/tenant-format";
import { Tooltip } from "antd";

/**
 * @typedef {{
 *   rate: number | null;
 *   foreign: boolean;
 *   primaryCode: string;
 *   currencyCode: string;
 * }} LinePricing
 */

/**
 * @param {unknown} rate
 */
export function formatExchangeRate(rate) {
  return formatTenantNumber(rate, { decimals: EXCHANGE_RATE_DECIMALS, trimTrailingZeros: true });
}

/**
 * Unit price input for document lines. In a foreign currency the tooltip shows the
 * primary-currency equivalent at the rate the price is expressed in.
 *
 * @param {{
 *   line: { unit_price?: unknown; price_rate?: number | null };
 *   pricing: LinePricing;
 *   disabled?: boolean;
 *   placeholder?: string;
 *   className?: string;
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   onChange: (value: number | null) => void;
 * }} props
 */
export default function LinePriceInput({ line, pricing, disabled, placeholder, className = "w-full", t, onChange }) {
  const lineRate = positiveRate(line.price_rate) ?? pricing.rate;
  const primaryAmount = pricing.foreign ? priceInPrimary(line.unit_price, lineRate) : null;
  const title =
    primaryAmount != null
      ? t("linePricePrimaryEquivalent", {
          amount: formatTenantMoney(primaryAmount),
          primary: pricing.primaryCode,
          rate: formatExchangeRate(lineRate),
          currency: pricing.currencyCode,
        })
      : undefined;

  return (
    <Tooltip title={title} mouseEnterDelay={0.3}>
      <TenantNumberInput
        kind="money"
        className={className}
        min={0}
        placeholder={placeholder}
        value={line.unit_price}
        disabled={disabled}
        onChange={onChange}
      />
    </Tooltip>
  );
}
