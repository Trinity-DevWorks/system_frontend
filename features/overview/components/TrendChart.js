"use client";

import { formatTenantMoneyWithSymbol } from "@/lib/tenant-format";
import { Empty, Tooltip } from "antd";
import { useLocale, useTranslations } from "next-intl";

/**
 * @param {unknown} value
 */
function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {string} period YYYY-MM
 * @param {string} locale
 */
function monthLabel(period, locale) {
  const [year, month] = String(period).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
}

/**
 * @param {{ period?: string, total?: unknown }[] | null | undefined} rows
 */
function byPeriod(rows) {
  /** @type {Map<string, number>} */
  const map = new Map();
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    if (!row?.period) continue;
    map.set(String(row.period), asNumber(row.total));
  }
  return map;
}

/**
 * Six-month posted activity in the company currency.
 *
 * @param {{
 *   sales: { period?: string, total?: unknown }[] | null,
 *   purchases: { period?: string, total?: unknown }[] | null,
 *   symbol: string,
 *   salesLabel: string,
 *   purchasesLabel: string,
 * }} props
 */
export default function TrendChart({ sales, purchases, symbol, salesLabel, purchasesLabel }) {
  const t = useTranslations("Overview");
  const locale = useLocale();
  const salesMap = byPeriod(sales);
  const purchaseMap = byPeriod(purchases);
  const periods = (Array.isArray(sales) && sales.length > 0 ? sales : purchases) ?? [];
  const showSales = salesMap.size > 0;
  const showPurchases = purchaseMap.size > 0;

  const points = periods.map((row) => {
    const period = String(row.period ?? "");
    return {
      period,
      label: monthLabel(period, locale),
      sales: salesMap.get(period) ?? 0,
      purchases: purchaseMap.get(period) ?? 0,
    };
  });

  const max = Math.max(0, ...points.flatMap((point) => [point.sales, point.purchases]));
  const hasActivity = max > 0;

  if (points.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("activityEmpty")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs">
        {showSales ? <LegendDot color="var(--ant-color-primary)" label={salesLabel} /> : null}
        {showPurchases ? <LegendDot color="var(--ant-color-warning)" label={purchasesLabel} /> : null}
      </div>
      <div className="flex h-44 items-end gap-2">
        {points.map((point) => (
          <div key={point.period} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
            <div className="flex h-full items-end justify-center gap-1">
              {showSales ? (
                <Bar
                  value={point.sales}
                  max={max}
                  color="var(--ant-color-primary)"
                  label={`${salesLabel}: ${formatTenantMoneyWithSymbol(point.sales, symbol)}`}
                />
              ) : null}
              {showPurchases ? (
                <Bar
                  value={point.purchases}
                  max={max}
                  color="var(--ant-color-warning)"
                  label={`${purchasesLabel}: ${formatTenantMoneyWithSymbol(point.purchases, symbol)}`}
                />
              ) : null}
            </div>
            <div className="truncate text-center text-[11px] text-[var(--ant-color-text-secondary)]">{point.label}</div>
          </div>
        ))}
      </div>
      {hasActivity ? null : (
        <div className="text-center text-xs text-[var(--ant-color-text-secondary)]">{t("activityEmpty")}</div>
      )}
    </div>
  );
}

/**
 * @param {{ color: string, label: string }} props
 */
function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/**
 * @param {{ value: number, max: number, color: string, label: string }} props
 */
function Bar({ value, max, color, label }) {
  const height = max > 0 && value > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <Tooltip title={label}>
      <div className="flex h-full w-2.5 items-end sm:w-3.5">
        <div
          className="w-full rounded-sm"
          style={{
            height: `${height}%`,
            background: color,
            minHeight: height > 0 ? 4 : 0,
          }}
        />
      </div>
    </Tooltip>
  );
}
