"use client";

/**
 * Audit log filter popover + summary strip (mirrors stock table filters UX).
 */

import { FilterOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, Form, Popover, Space, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

/** Two-column row for filter fields inside the popover. */
export const auditFilterFieldRowClassName =
  "grid grid-cols-2 gap-x-3 gap-y-0 [&_.ant-form-item]:mb-1 [&_.ant-form-item-label]:!min-h-0 [&_.ant-form-item-label]:!pb-0.5 [&_.ant-form-item-label>label]:!h-auto [&_.ant-form-item-label>label]:text-xs [&_.ant-picker]:w-full [&_.ant-select]:w-full [&_.ant-input]:w-full";

/**
 * @param {import("dayjs").Dayjs | null | undefined} from
 * @param {import("dayjs").Dayjs | null | undefined} to
 * @returns {string | null}
 */
export function formatAuditFilterDateRange(from, to) {
  if (!from && !to) return null;
  const fmt = (/** @type {import("dayjs").Dayjs} */ d) => d.format("YYYY-MM-DD");
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return fmt(from);
  return fmt(/** @type {import("dayjs").Dayjs} */ (to));
}

/**
 * @param {{
 *   activeCount?: number;
 *   summary?: { label: string; value: string }[];
 *   onClearAll?: () => void;
 *   defaultExpanded?: boolean;
 *   children: import("react").ReactNode;
 * }} options
 */
export function useAuditLogFilters({
  activeCount = 0,
  summary = [],
  onClearAll,
  defaultExpanded = false,
  children,
}) {
  const t = useTranslations("AuditLog");
  const [open, setOpen] = useState(defaultExpanded);
  const hasActive = activeCount > 0;

  const popoverContent = useMemo(
    () => (
      <ConfigProvider
        getPopupContainer={(node) =>
          node?.closest?.(".audit-log-filters-popover") ?? document.body
        }
      >
        <div className="audit-log-filters-popover audit-log-filters-panel w-[min(100vw-2rem,36rem)]">
          <Form layout="vertical" size="middle" className="mb-0">
            {children}
          </Form>
        </div>
      </ConfigProvider>
    ),
    [children],
  );

  const toggle = useMemo(
    () => (
      <Space size={4} align="center">
        <Popover
          open={open}
          onOpenChange={setOpen}
          trigger="click"
          placement="bottomLeft"
          arrow={false}
          content={popoverContent}
        >
          <Button icon={<FilterOutlined />}>
            {t("filters")}
            {hasActive ? ` (${activeCount})` : ""}
          </Button>
        </Popover>
        {hasActive ? (
          <Button type="link" size="small" onClick={onClearAll}>
            {t("filtersClear")}
          </Button>
        ) : null}
      </Space>
    ),
    [activeCount, hasActive, onClearAll, open, popoverContent, t],
  );

  const filterBar =
    hasActive && summary.length > 0 ? (
      <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
        {summary.map((line) => (
          <Tag key={`${line.label}:${line.value}`}>
            <Typography.Text type="secondary" className="text-xs">
              {line.label}:{" "}
            </Typography.Text>
            {line.value}
          </Tag>
        ))}
      </div>
    ) : null;

  return { toggle, filterBar };
}
