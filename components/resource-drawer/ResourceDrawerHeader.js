"use client";

import { getActiveStatusBadgeClass } from "@/components/tables/ActiveStatusBadge";
import { CloseOutlined, CompressOutlined, ExpandOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";

const DRAWER_STATUS_BADGE_BASE =
  "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";

/**
 * Drawer header row: title (+ optional record name), status badge, expand and close actions.
 *
 * @param {{
 *   title: import("react").ReactNode;
 *   recordName?: string | null;
 *   statusActive?: boolean | null;
 *   statusActiveLabel?: string;
 *   statusInactiveLabel?: string;
 *   expanded?: boolean;
 *   onToggleExpand?: () => void;
 *   onClose: () => void;
 *   closeDisabled?: boolean;
 *   showExpand?: boolean;
 * }} props
 */
export default function ResourceDrawerHeader({
  title,
  recordName,
  statusActive = null,
  statusActiveLabel = "Active",
  statusInactiveLabel = "Inactive",
  expanded = false,
  onToggleExpand,
  onClose,
  closeDisabled = false,
  showExpand = true,
}) {
  const name = typeof recordName === "string" ? recordName.trim() : "";
  const showStatus = statusActive !== null && statusActive !== undefined;

  return (
    <div className="resource-drawer-header-inner flex w-full min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Typography.Title level={5} className="!mb-0 min-w-0 truncate !text-base !font-semibold">
          <span>{title}</span>
          {name ? (
            <span className="font-semibold text-[var(--ant-color-text)]">{`: ${name}`}</span>
          ) : null}
        </Typography.Title>
        {showStatus ? (
          <span className={`${DRAWER_STATUS_BADGE_BASE} ${getActiveStatusBadgeClass(statusActive)}`}>
            {statusActive ? statusActiveLabel : statusInactiveLabel}
          </span>
        ) : null}
      </div>
      <Space size={4} className="shrink-0">
        {showExpand && onToggleExpand ? (
          <Button
            type="text"
            size="small"
            className="!text-[var(--ant-color-text-secondary)]"
            icon={expanded ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={onToggleExpand}
            disabled={closeDisabled}
            aria-label={expanded ? "Exit full width" : "Expand drawer"}
          />
        ) : null}
        <Button
          type="text"
          size="small"
          className="!text-[var(--ant-color-text-secondary)]"
          icon={<CloseOutlined />}
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Close"
        />
      </Space>
    </div>
  );
}
