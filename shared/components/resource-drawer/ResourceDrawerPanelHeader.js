"use client";

import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip, Typography } from "antd";

/**
 * Tab panel heading row: title + description on the left, actions (e.g. Add) on the right.
 *
 * @param {{
 *   title: import("react").ReactNode;
 *   description?: string;
 *   help?: string;
 *   actions?: import("react").ReactNode;
 *   actionsClassName?: string;
 * }} props
 */
export default function ResourceDrawerPanelHeader({
  title,
  description,
  help,
  actions,
  actionsClassName,
}) {
  const desc = typeof description === "string" ? description.trim() : "";

  return (
    <div className="resource-drawer-panel-header mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Typography.Title level={5} className="!mb-1 !text-base !font-semibold">
          {title}
          {/* Explanation behind a ? icon instead of a paragraph under the title. */}
          {help ? (
            <Tooltip title={help}>
              <QuestionCircleOutlined
                className="item-general-form-label-help"
                aria-label={help}
              />
            </Tooltip>
          ) : null}
        </Typography.Title>
        {desc ? (
          <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
            {desc}
          </Typography.Paragraph>
        ) : null}
      </div>
      {actions ? (
        <div
          className={["shrink-0 pt-0.5", actionsClassName]
            .filter(Boolean)
            .join(" ")}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
