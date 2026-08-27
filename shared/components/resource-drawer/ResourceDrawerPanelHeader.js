"use client";

import { Typography } from "antd";

/**
 * Tab panel heading row: title + description on the left, actions (e.g. Add) on the right.
 *
 * @param {{
 *   title: import("react").ReactNode;
 *   description?: string;
 *   actions?: import("react").ReactNode;
 * }} props
 */
export default function ResourceDrawerPanelHeader({ title, description, actions }) {
  const desc = typeof description === "string" ? description.trim() : "";

  return (
    <div className="resource-drawer-panel-header mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Typography.Title level={5} className="!mb-1 !text-base !font-semibold">
          {title}
        </Typography.Title>
        {desc ? (
          <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
            {desc}
          </Typography.Paragraph>
        ) : null}
      </div>
      {actions ? <div className="shrink-0 pt-0.5">{actions}</div> : null}
    </div>
  );
}
