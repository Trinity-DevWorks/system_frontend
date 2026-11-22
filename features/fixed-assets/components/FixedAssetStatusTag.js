"use client";

import { Tag } from "antd";

const COLORS = { draft: "default", active: "green", fully_depreciated: "blue", disposed: "volcano" };

/** @param {{ status: string | null | undefined; t: (key: string) => string }} props */
export default function FixedAssetStatusTag({ status, t }) {
  const value = status ?? "draft";
  return (
    <Tag color={COLORS[value] ?? "default"} className="!m-0">
      {t(value)}
    </Tag>
  );
}
