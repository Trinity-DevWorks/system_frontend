"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useMemo } from "react";

/** @typedef {{ key: string; label: string; width?: string }} ItemDrawerLinesGridColumn */

export const ITEM_LINES_GRID_DEFAULT_COLUMN_WIDTH = "minmax(0, 1fr)";
export const ITEM_LINES_GRID_ACTIONS_WIDTH = "40px";

/**
 * Build CSS grid-template-columns from column widths + trailing actions column.
 * @param {ItemDrawerLinesGridColumn[]} columns
 * @param {string} [actionsWidth]
 */
export function buildItemDrawerLinesGridTemplate(
  columns,
  actionsWidth = ITEM_LINES_GRID_ACTIONS_WIDTH,
) {
  return [
    ...columns.map((col) => col.width ?? ITEM_LINES_GRID_DEFAULT_COLUMN_WIDTH),
    actionsWidth,
  ].join(" ");
}

/**
 * Shared line grid for item recipe/bundle panels and stock transfer lines.
 *
 * Column widths are declared on each column (`width`) or via `actionsColumnWidth`.
 *
 * @param {{
 *   columns: ItemDrawerLinesGridColumn[];
 *   lines: unknown[];
 *   canAddLine: boolean;
 *   onAddLine: () => void;
 *   addLabel: string;
 *   deleteAriaLabel: string;
 *   onRemoveLine: (index: number) => void;
 *   renderField: (line: unknown, index: number, columnKey: string) => import("react").ReactNode;
 *   readOnly?: boolean;
 *   actionsColumnWidth?: string;
 * }} props
 */
export default function ItemDrawerLinesGrid({
  columns,
  lines,
  canAddLine,
  onAddLine,
  addLabel,
  deleteAriaLabel,
  onRemoveLine,
  renderField,
  readOnly = false,
  actionsColumnWidth = ITEM_LINES_GRID_ACTIONS_WIDTH,
}) {
  const gridTemplateColumns = useMemo(
    () => buildItemDrawerLinesGridTemplate(columns, actionsColumnWidth),
    [columns, actionsColumnWidth],
  );

  return (
    <div className="item-lines-section-card">
      <div className="item-lines-grid" style={{ gridTemplateColumns }}>
        {columns.map((col) => (
          <span key={col.key} className="item-lines-col-label">
            {col.label}
          </span>
        ))}
        <span className="item-lines-col-label item-lines-col-actions" aria-hidden />

        {lines.map((line, index) => (
          <div key={index} className="item-lines-row">
            {columns.map((col) => (
              <div key={col.key} className="item-lines-row-field">
                {renderField(line, index, col.key)}
              </div>
            ))}
            {readOnly ? (
              <span className="item-lines-row-delete" aria-hidden />
            ) : (
              <Button
                className="item-lines-row-delete"
                icon={<DeleteOutlined />}
                aria-label={deleteAriaLabel}
                onClick={() => onRemoveLine(index)}
              />
            )}
          </div>
        ))}
      </div>

      {!readOnly ? (
        <Button
          type="primary"
          ghost
          icon={<PlusOutlined />}
          className="item-lines-add-row"
          disabled={!canAddLine}
          onClick={onAddLine}
        >
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
