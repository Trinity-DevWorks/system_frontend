"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";

/**
 * Shared ingredient/component lines grid for item Recipe and Bundle tabs.
 *
 * @param {{
 *   variant: "recipe" | "bundle";
 *   columns: { key: string; label: string }[];
 *   lines: unknown[];
 *   canAddLine: boolean;
 *   onAddLine: () => void;
 *   addLabel: string;
 *   deleteAriaLabel: string;
 *   onRemoveLine: (index: number) => void;
 *   renderField: (line: unknown, index: number, columnKey: string) => import("react").ReactNode;
 * }} props
 */
export default function ItemDrawerLinesGrid({
  variant,
  columns,
  lines,
  canAddLine,
  onAddLine,
  addLabel,
  deleteAriaLabel,
  onRemoveLine,
  renderField,
}) {
  return (
    <div className="item-lines-section-card">
      <div className={`item-lines-grid item-lines-grid--${variant}`}>
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
            <Button
              className="item-lines-row-delete"
              icon={<DeleteOutlined />}
              aria-label={deleteAriaLabel}
              onClick={() => onRemoveLine(index)}
            />
          </div>
        ))}
      </div>

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
    </div>
  );
}
