"use client";

import { formatTenantDate, formatTenantMoney } from "@/lib/tenant-format";
import { theme } from "antd";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import { useMemo } from "react";

// The chart library draws on a canvas in the browser only.
const Line = dynamic(() => import("@ant-design/plots").then((mod) => mod.Line), { ssr: false });

/** True when antd is using a dark background. */
function isDarkColor(hex) {
  const value = String(hex ?? "").replace("#", "");
  if (value.length < 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/**
 * Price over time for one unit: one coloured step line per price (selling, cost, each price list).
 * A price holds until the next change, so the line steps at each change and runs on to today.
 *
 * @param {{
 *   rows: Array<Record<string, any>>;
 *   seriesLabel: (row: Record<string, any>) => string;
 * }} props
 */
export default function ItemPriceHistoryChart({ rows, seriesLabel }) {
  const { token } = theme.useToken();
  const dark = isDarkColor(token.colorBgContainer);

  const data = useMemo(() => {
    /** @type {Map<string, Array<Record<string, any>>>} */
    const bySeries = new Map();
    [...rows]
      .filter((row) => row.new_value != null && row.effective_at)
      // Oldest first; changes at the same moment keep the order they were made in (id).
      .sort(
        (a, b) =>
          new Date(a.effective_at).getTime() - new Date(b.effective_at).getTime() ||
          Number(a.id ?? 0) - Number(b.id ?? 0),
      )
      .forEach((row) => {
        const name = seriesLabel(row);
        if (!bySeries.has(name)) bySeries.set(name, []);
        bySeries.get(name).push(row);
      });

    const now = new Date();
    const points = [];
    bySeries.forEach((changes, name) => {
      const first = changes[0];
      // Start from the price before the first change, so the first step is visible.
      if (first.old_value != null) {
        points.push({ date: new Date(first.effective_at), value: Number(first.old_value), series: name });
      }
      changes.forEach((row) => {
        points.push({ date: new Date(row.effective_at), value: Number(row.new_value), series: name });
      });
      const last = changes[changes.length - 1];
      if (new Date(last.effective_at) < now) {
        points.push({ date: now, value: Number(last.new_value), series: name });
      }
    });
    return points;
  }, [rows, seriesLabel]);

  // Prices are shown by day. The axis covers at least the last 7 days, so changes made
  // on one day still get distinct date labels around them.
  const times = data.map((point) => point.date.getTime());
  const end = dayjs().endOf("day");
  const firstDay = dayjs(Math.min(...times)).startOf("day");
  const weekAgo = end.subtract(7, "day").startOf("day");
  const start = firstDay.isBefore(weekAgo) ? firstDay : weekAgo;
  const formatX = (value) => formatTenantDate(dayjs(value).format("YYYY-MM-DD"));

  if (data.length < 2) return null;

  return (
    <Line
      data={data}
      xField="date"
      yField="value"
      colorField="series"
      shapeField="hv"
      height={220}
      autoFit
      theme={dark ? "classicDark" : "classic"}
      style={{ lineWidth: 2 }}
      point={{ shapeField: "circle", sizeField: 3 }}
      scale={{ x: { domain: [start.toDate(), end.toDate()] }, y: { nice: true } }}
      legend={{ color: { position: "top", layout: { justifyContent: "flex-start" } } }}
      axis={{
        x: {
          title: false,
          labelFormatter: formatX,
          tickCount: 4,
        },
        y: {
          title: false,
          labelFormatter: (value) => formatTenantMoney(value),
        },
      }}
      tooltip={{
        title: (d) => formatX(d.date),
        items: [(d) => ({ name: d.series, value: formatTenantMoney(d.value) })],
      }}
    />
  );
}
