"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Dropdown, theme } from "antd";
import { useCallback, useMemo, useState } from "react";

/** @typedef {{ key: string; label: import("react").ReactNode; width?: string }} LinesGridColumn */

export const ITEM_LINES_GRID_DEFAULT_COLUMN_WIDTH = "minmax(0, 1fr)";
export const ITEM_LINES_GRID_ACTIONS_WIDTH = "40px";

/**
 * Drawer uses zIndexPopupBase + 100 (~1100). Stay above that, under Ant's warning ceiling
 * (zIndexPopupBase + 1100).
 */
function useLinesGridContextMenuZIndex() {
  const { token } = theme.useToken();
  return token.zIndexPopupBase + 200;
}

/**
 * Build CSS grid-template-columns from column widths + optional trailing actions column.
 * @param {LinesGridColumn[]} columns
 * @param {string | null} [actionsWidth] Pass `null` to omit the delete/actions column.
 */
export function buildLinesGridTemplate(
  columns,
  actionsWidth = ITEM_LINES_GRID_ACTIONS_WIDTH,
) {
  const widths = columns.map((col) => col.width ?? ITEM_LINES_GRID_DEFAULT_COLUMN_WIDTH);
  if (actionsWidth == null) return widths.join(" ");
  return [...widths, actionsWidth].join(" ");
}

/**
 * Shared line grid for item recipe/bundle panels and stock / sales document lines.
 *
 * Each data row is a real grid container so hover and row context menus work.
 * Context menus use Ant Design Dropdown (same chrome as table row menus), portaled to
 * document.body with an explicit z-index above drawers.
 *
 * @param {{
 *   columns: LinesGridColumn[];
 *   lines: unknown[];
 *   canAddLine: boolean;
 *   onAddLine: () => void;
 *   addLabel: string;
 *   deleteAriaLabel?: string;
 *   onRemoveLine?: (index: number) => void;
 *   canRemoveLine?: boolean;
 *   showDeleteColumn?: boolean;
 *   getRowMenuItems?: (line: unknown, index: number) => import("antd").MenuProps["items"] | null | undefined;
 *   renderField: (line: unknown, index: number, columnKey: string) => import("react").ReactNode;
 *   readOnly?: boolean;
 *   actionsColumnWidth?: string;
 * }} props
 */
export default function LinesGrid({
  columns,
  lines,
  canAddLine,
  onAddLine,
  addLabel,
  deleteAriaLabel = "Remove line",
  onRemoveLine,
  canRemoveLine = true,
  showDeleteColumn = true,
  getRowMenuItems,
  renderField,
  readOnly = false,
  actionsColumnWidth = ITEM_LINES_GRID_ACTIONS_WIDTH,
}) {
  const contextMenuZIndex = useLinesGridContextMenuZIndex();
  const gridTemplateColumns = useMemo(
    () => buildLinesGridTemplate(columns, showDeleteColumn ? actionsColumnWidth : null),
    [actionsColumnWidth, columns, showDeleteColumn],
  );

  const [contextMenu, setContextMenu] = useState(
    /** @type {{ open: boolean; x: number; y: number; items: NonNullable<import("antd").MenuProps["items"]>; rowIndex: number | null }} */ ({
      open: false,
      x: 0,
      y: 0,
      items: [],
      rowIndex: null,
    }),
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => (prev.open ? { ...prev, open: false, rowIndex: null, items: [] } : prev));
  }, []);

  const handleRowContextMenu = useCallback(
    (event, line, index) => {
      if (!getRowMenuItems) return;
      const items = getRowMenuItems(line, index);
      if (!items?.length) return;
      event.preventDefault();
      event.stopPropagation();
      const next = {
        open: true,
        x: event.clientX,
        y: event.clientY,
        items,
        rowIndex: index,
      };
      // Open after the native contextmenu finishes so Dropdown does not instantly close.
      window.setTimeout(() => setContextMenu(next), 0);
    },
    [getRowMenuItems],
  );

  return (
    <div className="item-lines-section-card">
      <div className="item-lines-grid">
        <div className="item-lines-header" style={{ gridTemplateColumns }}>
          {columns.map((col) => (
            <span key={col.key} className="item-lines-col-label">
              {col.label}
            </span>
          ))}
          {showDeleteColumn ? (
            <span className="item-lines-col-label item-lines-col-actions" aria-hidden />
          ) : null}
        </div>

        {lines.map((line, index) => (
          <div
            key={index}
            className={[
              "item-lines-row",
              contextMenu.open && contextMenu.rowIndex === index ? "item-lines-row-menu-open" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ gridTemplateColumns }}
            onContextMenu={(event) => handleRowContextMenu(event, line, index)}
          >
            {columns.map((col) => (
              <div key={col.key} className="item-lines-row-field">
                {renderField(line, index, col.key)}
              </div>
            ))}
            {showDeleteColumn ? (
              readOnly || !canRemoveLine || !onRemoveLine ? (
                <span className="item-lines-row-delete" aria-hidden />
              ) : (
                <Button
                  className="item-lines-row-delete"
                  icon={<DeleteOutlined />}
                  aria-label={deleteAriaLabel}
                  onClick={() => onRemoveLine(index)}
                />
              )
            ) : null}
          </div>
        ))}
      </div>

      {getRowMenuItems ? (
        <Dropdown
          menu={{
            items: contextMenu.items,
            onClick: () => closeContextMenu(),
          }}
          open={contextMenu.open}
          onOpenChange={(open) => {
            if (!open) closeContextMenu();
          }}
          trigger={["click"]}
          placement="bottomLeft"
          align={{ offset: [0, 0] }}
          getPopupContainer={() => document.body}
          destroyOnHidden
          styles={{
            root: {
              zIndex: contextMenuZIndex,
            },
          }}
        >
          <span
            className="item-lines-context-menu-anchor"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            aria-hidden
          />
        </Dropdown>
      ) : null}

      {!readOnly && canAddLine ? (
        <Button
          type="primary"
          ghost
          icon={<PlusOutlined />}
          className="item-lines-add-row"
          onClick={onAddLine}
        >
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
