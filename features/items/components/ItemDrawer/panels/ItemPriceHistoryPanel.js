"use client";

import { useForwardArrow } from "@/lib/direction-arrow";
import { fetchItemPriceHistory } from "@/features/price-changes/api/priceChanges.api";
import { getLocalizedApiErrorMessage } from "@/lib/api-error-notify";
import { isPersistedEntityId } from "@/lib/entityId";
import {
  formatTenantDate,
  formatTenantMoney,
  formatTenantNumber,
} from "@/lib/tenant-format";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Alert, Empty, Spin, Timeline, Typography } from "antd";
import { useCallback, useMemo } from "react";
import ItemPriceHistoryChart from "./ItemPriceHistoryChart";

/**
 * @param {{
 *   itemId: string;
 *   active: boolean;
 *   t: (key: string) => string;
 *   tApiErrors: (key: string) => string;
 * }} props
 */
export default function ItemPriceHistoryPanel({
  itemId,
  active,
  t,
  tApiErrors,
}) {
  const arrow = useForwardArrow();
  const query = useQuery({
    queryKey: ["tenant", "items", itemId, "price-history"],
    queryFn: () => fetchItemPriceHistory(itemId),
    enabled: active && isPersistedEntityId(itemId),
  });
  const rows = useMemo(
    () => (Array.isArray(query.data?.rows) ? query.data.rows : []),
    [query.data],
  );
  // One chart per unit; its lines are the prices that changed for that unit.
  const units = useMemo(() => {
    /** @type {Map<string, { key: string; uom: string; rows: any[] }>} */
    const byUnit = new Map();
    rows.forEach((row) => {
      const key = String(row.item_uom_id ?? row.uom ?? "-");
      if (!byUnit.has(key))
        byUnit.set(key, { key, uom: row.uom || "", rows: [] });
      byUnit.get(key).rows.push(row);
    });
    return [...byUnit.values()];
  }, [rows]);
  const seriesLabel = useCallback(
    (row) =>
      [t(`priceField_${row.field}`), row.price_list]
        .filter(Boolean)
        .join(" · "),
    [t],
  );

  if (query.isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title={getLocalizedApiErrorMessage(tApiErrors, query.error)}
      />
    );
  }
  if (rows.length === 0) {
    return <Empty description={t("priceHistoryEmpty")} />;
  }

  return (
    <div className="flex flex-col gap-6 px-1 py-2">
      <div className="flex flex-col gap-3">
        {units.map((unit) => (
          <div
            key={unit.key}
            className="rounded-md border border-[var(--ant-color-border-secondary)] p-3"
          >
            <Typography.Text strong>
              {unit.uom || t("priceHistorySelling")}
            </Typography.Text>
            <ItemPriceHistoryChart rows={unit.rows} seriesLabel={seriesLabel} />
          </div>
        ))}
      </div>
      <Timeline
        items={rows.map((row) => {
          // Up = green arrow, down = red arrow, no change / unknown = grey.
          const oldValue = row.old_value != null ? Number(row.old_value) : null;
          const newValue = row.new_value != null ? Number(row.new_value) : null;
          const diff =
            oldValue != null && newValue != null ? newValue - oldValue : null;
          const direction =
            diff == null || diff === 0 ? "same" : diff > 0 ? "up" : "down";
          const color =
            direction === "up"
              ? "green"
              : direction === "down"
                ? "red"
                : "gray";
          const sign =
            direction === "up" ? "+" : direction === "down" ? "−" : "";
          const percent =
            row.change_percent != null && row.change_percent !== ""
              ? formatTenantNumber(Math.abs(Number(row.change_percent)), {
                  decimals: 2,
                  trimTrailingZeros: true,
                })
              : null;
          return {
            key: String(row.id),
            color,
            content: (
              <div className="flex flex-col gap-0.5">
                <Typography.Text strong>
                  {t(`priceField_${row.field}`)}
                  {row.uom ? ` · ${row.uom}` : ""}
                  {row.price_list ? ` · ${row.price_list}` : ""}
                </Typography.Text>
                <span className="flex flex-wrap items-center gap-2 tabular-nums">
                  <span>
                    {formatTenantMoney(row.old_value) || "—"} {arrow}{" "}
                    {formatTenantMoney(row.new_value) || "—"}
                  </span>
                  {direction !== "same" ? (
                    <Typography.Text
                      type={direction === "up" ? "success" : "danger"}
                      className="text-sm"
                    >
                      {direction === "up" ? (
                        <ArrowUpOutlined />
                      ) : (
                        <ArrowDownOutlined />
                      )}{" "}
                      {sign}
                      {formatTenantMoney(Math.abs(diff))}
                      {percent != null ? ` (${sign}${percent}%)` : ""}
                    </Typography.Text>
                  ) : null}
                </span>
                <Typography.Text type="secondary">
                  {[
                    formatTenantDate(String(row.effective_at).slice(0, 10)),
                    row.user,
                    t(`priceSource_${row.source}`),
                    row.reason,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography.Text>
              </div>
            ),
          };
        })}
      />
    </div>
  );
}
