"use client";

/**
 * Stock table filters: toolbar popover for fields, summary strip when filters are active.
 */

import { formatTenantDateRangeLabel } from "@/lib/tenant-format";
import { FilterOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, Form, Popover, Space, Tag, Typography, theme } from "antd";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

/**
 * @typedef {{ label: string, value: string }} StockFilterSummaryLine
 */

/**
 * @param {import("dayjs").Dayjs | null | undefined} from
 * @param {import("dayjs").Dayjs | null | undefined} to
 * @returns {string | null}
 */
/** Two-column row for filter fields inside the popover. */
export const stockFilterFieldRowClassName =
  "grid grid-cols-2 gap-x-3 gap-y-0 [&_.ant-checkbox-wrapper]:min-h-8 [&_.ant-checkbox-wrapper]:items-center [&_.ant-form-item]:mb-1 [&_.ant-form-item-label]:!min-h-0 [&_.ant-form-item-label]:!pb-0.5 [&_.ant-form-item-label>label]:!h-auto [&_.ant-form-item-label>label]:text-xs [&_.ant-picker]:w-full [&_.ant-select]:w-full";

export function formatStockFilterDateRange(from, to) {
  return formatTenantDateRangeLabel(from, to);
}

/**
 * @param {{
 *   activeCount?: number,
 *   summary?: StockFilterSummaryLine[],
 *   onClearAll?: () => void,
 *   defaultExpanded?: boolean,
 *   children: import("react").ReactNode,
 * }} options
 */
export function useStockTableFilters({
  activeCount = 0,
  summary = [],
  onClearAll,
  defaultExpanded = false,
  children,
}) {
  const t = useTranslations("Stock");
  const { token } = theme.useToken();
  const [open, setOpen] = useState(defaultExpanded);

  const hasActive = activeCount > 0;

  const popoverContent = useMemo(
    () => (
      <ConfigProvider
        getPopupContainer={(node) =>
          node?.closest?.(".stock-table-filters-popover") ?? document.body
        }
      >
        <div className="stock-table-filters-popover stock-table-filters-panel w-[min(100vw-2rem,36rem)]">
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
          <Button
            icon={<FilterOutlined />}
            aria-expanded={open}
            aria-label={open ? t("filterHideFilters") : t("filterShowFilters")}
          >
            <span className="inline-flex items-center gap-1.5">
              {open ? t("filterHideFilters") : t("filterShowFilters")}
              {hasActive ? (
                <span
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold leading-none text-white"
                  style={{ background: token.colorPrimary }}
                  aria-label={t("filterActiveSummary")}
                >
                  {activeCount}
                </span>
              ) : null}
            </span>
          </Button>
        </Popover>
        {hasActive && onClearAll ? (
          <Button type="link" size="small" className="!px-1" onClick={onClearAll}>
            {t("filterClearAll")}
          </Button>
        ) : null}
      </Space>
    ),
    [activeCount, hasActive, onClearAll, open, popoverContent, t, token.colorPrimary],
  );

  const filterBar = useMemo(() => {
    if (summary.length === 0) return null;

    return (
      <div className="rounded-md border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2">
          <div
            className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
            aria-label={t("filterActiveSummary")}
          >
            {summary.map((line) => (
              <Tag key={`${line.label}-${line.value}`} className="m-0 max-w-full truncate">
                <Typography.Text type="secondary" className="text-xs">
                  {line.label}:
                </Typography.Text>{" "}
                <span className="text-xs">{line.value}</span>
              </Tag>
            ))}
          </div>
        </div>
      </div>
    );
  }, [summary, t]);

  return {
    toggle,
    filterBar,
    expanded: open,
    setExpanded: setOpen,
  };
}

/** @deprecated Use `useStockTableFilters` instead. */
export default function StockTableFilters(props) {
  const { filterBar } = useStockTableFilters(props);
  return filterBar;
}
