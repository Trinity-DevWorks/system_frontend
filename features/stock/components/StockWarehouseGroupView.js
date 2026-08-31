"use client";

import { DownOutlined } from "@ant-design/icons";
import {
  flattenWarehouseGroups,
  groupStockRowsByWarehouse,
  isWarehouseGroupRow,
  sortRowsInWarehouseGroups,
} from "../utils/groupStockRowsByWarehouse";
import { Segmented, Typography } from "antd";
import { useCallback, useMemo, useState } from "react";

const DEFAULT_HIDDEN_GROUP_COLUMNS = ["warehouse"];

/**
 * @param {import("antd").ColumnType<any>} col
 * @returns {string}
 */
function columnSortKey(col) {
  return String(col.key ?? col.dataIndex ?? "");
}

/**
 * @param {import("antd").ColumnType<any>} col
 * @returns {((a: any, b: any) => number) | null}
 */
function columnSortCompare(col) {
  if (typeof col.sorter === "function") return col.sorter;
  if (col.sorter && typeof col.sorter.compare === "function") return col.sorter.compare;
  return null;
}

/**
 * @param {import("antd").TableProps["columns"]} columns
 * @returns {{ key: string, order: "ascend" | "descend", compare: (a: any, b: any) => number } | null}
 */
function defaultColumnSort(columns) {
  for (const col of columns ?? []) {
    const compare = columnSortCompare(col);
    if (compare && (col.defaultSortOrder === "ascend" || col.defaultSortOrder === "descend")) {
      return { key: columnSortKey(col), order: col.defaultSortOrder, compare };
    }
  }
  return null;
}

function wrapGroupChildCell(record, node) {
  if (!record?.__isWarehouseGroupChild) return node;
  return (
    <div className="stock-warehouse-group-child-inner">
      <div className="stock-warehouse-group-child-inner-clip">{node}</div>
    </div>
  );
}

/**
 * @param {{
 *   name: string;
 *   count: number;
 *   expanded: boolean;
 *   countLabel: string;
 *   toggleAria: string;
 *   onToggle: () => void;
 * }} props
 */
function WarehouseGroupHeader({ name, count, expanded, countLabel, toggleAria, onToggle }) {
  return (
    <button
      type="button"
      className="stock-warehouse-group-toggle"
      aria-expanded={expanded}
      aria-label={toggleAria}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <DownOutlined className={expanded ? "" : "stock-warehouse-group-chevron-collapsed"} />
      <span className="min-w-0 truncate font-semibold">{name}</span>
      <Typography.Text type="secondary" className="shrink-0 text-xs">
        {countLabel}
      </Typography.Text>
    </button>
  );
}

/**
 * List vs warehouse-grouped table data for balances / movements.
 *
 * @param {{
 *   enabled: boolean;
 *   rows: Record<string, unknown>[];
 *   columns: import("antd").TableProps["columns"];
 *   t: (key: string, values?: Record<string, unknown>) => string;
 *   hideColumnKeys?: string[];
 * }} args
 */
export function useWarehouseGroupedTable({
  enabled,
  rows,
  columns,
  t,
  hideColumnKeys = DEFAULT_HIDDEN_GROUP_COLUMNS,
}) {
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [sortOverride, setSortOverride] = useState(
    /** @type {{ key: string, order: "ascend" | "descend" | null } | null} */ (null),
  );

  const groups = useMemo(
    () => groupStockRowsByWarehouse(rows, t("warehouseGroupUnknown")),
    [rows, t],
  );

  const fallbackSort = useMemo(() => defaultColumnSort(columns), [columns]);
  const activeSortKey = sortOverride?.key ?? fallbackSort?.key ?? "";
  const activeSortOrder = sortOverride ? sortOverride.order : (fallbackSort?.order ?? null);
  const activeCompare = useMemo(() => {
    if (!activeSortKey || !activeSortOrder) return null;
    const col = (columns ?? []).find((c) => columnSortKey(c) === activeSortKey);
    return col ? columnSortCompare(col) : null;
  }, [activeSortKey, activeSortOrder, columns]);

  const toggleGroup = useCallback((id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleTableChange = useCallback((_pagination, _filters, sorter) => {
    const next = Array.isArray(sorter) ? sorter[0] : sorter;
    const key = String(next?.columnKey ?? next?.field ?? "");
    const order = next?.order === "ascend" || next?.order === "descend" ? next.order : null;
    setSortOverride({ key, order });
  }, []);

  const dataSource = useMemo(() => {
    if (!enabled) return rows;
    const sortedGroups = sortRowsInWarehouseGroups(groups, activeCompare, activeSortOrder);
    return flattenWarehouseGroups(sortedGroups, collapsedIds);
  }, [activeCompare, activeSortOrder, collapsedIds, enabled, groups, rows]);

  const groupedColumns = useMemo(() => {
    if (!enabled) return columns;
    const visible = (columns ?? []).filter((col) => {
      const key = String(col.key ?? col.dataIndex ?? "");
      return !hideColumnKeys.includes(key);
    });
    return visible.map((col, index) => {
      const isFirst = index === 0;
      const compare = columnSortCompare(col);
      const key = columnSortKey(col);
      return {
        ...col,
        defaultSortOrder: undefined,
        sortOrder: compare ? (activeSortKey === key ? activeSortOrder : null) : col.sortOrder,
        sorter: compare ? true : col.sorter,
        onCell: (record) => {
          if (isWarehouseGroupRow(record)) {
            return isFirst
              ? { colSpan: visible.length, className: "stock-warehouse-group-cell" }
              : { colSpan: 0 };
          }
          return typeof col.onCell === "function" ? col.onCell(record) : {};
        },
        render: (value, record, rowIndex) => {
          if (isWarehouseGroupRow(record)) {
            if (!isFirst) return null;
            return (
              <WarehouseGroupHeader
                name={record.__groupName}
                count={record.__groupCount}
                expanded={record.__groupExpanded}
                countLabel={t("warehouseGroupCount", { count: record.__groupCount })}
                toggleAria={t("warehouseGroupToggleAria")}
                onToggle={() => toggleGroup(record.__groupId)}
              />
            );
          }
          const content =
            typeof col.render === "function" ? col.render(value, record, rowIndex) : value;
          return wrapGroupChildCell(record, content);
        },
      };
    });
  }, [activeSortKey, activeSortOrder, columns, enabled, hideColumnKeys, t, toggleGroup]);

  const rowClassName = useCallback((record) => {
    if (isWarehouseGroupRow(record)) return "stock-warehouse-group-row";
    if (record?.__isWarehouseGroupChild) {
      return record.__groupCollapsed
        ? "stock-warehouse-group-child stock-warehouse-group-child-collapsed"
        : "stock-warehouse-group-child";
    }
    return "";
  }, []);

  const onRow = useCallback(
    (record) => {
      if (isWarehouseGroupRow(record)) {
        return {
          onClick: () => toggleGroup(record.__groupId),
        };
      }
      if (record?.__groupCollapsed) return { "aria-hidden": true };
      return {};
    },
    [toggleGroup],
  );

  const resolveRowKey = useCallback((baseRowKey) => {
    return (row) => {
      if (isWarehouseGroupRow(row)) return row.__groupKey;
      if (typeof baseRowKey === "function") return baseRowKey(row);
      if (typeof baseRowKey === "string") return row[baseRowKey];
      return undefined;
    };
  }, []);

  return {
    dataSource,
    columns: groupedColumns,
    rowClassName: enabled ? rowClassName : undefined,
    onRow: enabled ? onRow : undefined,
    resolveRowKey,
    onTableChange: enabled ? handleTableChange : undefined,
  };
}

/**
 * @param {{
 *   value: "list" | "warehouse";
 *   onChange: (next: "list" | "warehouse") => void;
 *   t: (key: string) => string;
 * }} props
 */
export function StockWarehouseViewSwitch({ value, onChange, t }) {
  return (
    <Segmented
      size="middle"
      value={value}
      onChange={(next) => onChange(/** @type {"list" | "warehouse"} */ (next))}
      options={[
        { label: t("viewList"), value: "list" },
        { label: t("viewByWarehouse"), value: "warehouse" },
      ]}
    />
  );
}
