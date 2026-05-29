"use client";

import { Button } from "antd";
import { cloneElement, isValidElement } from "react";

/**
 * Wraps a Select/TreeSelect so "+ Add new" sits in the same bordered box (footer below a divider).
 * Forwards Form.Item control props (value, onChange, etc.) to the child select.
 *
 * @param {{
 *   showFooter: boolean;
 *   addNewLabel?: string;
 *   onAddNew?: () => void;
 *   children: import("react").ReactElement;
 * }} props
 */
export default function LookupFieldWithAddFooter({
  showFooter,
  addNewLabel,
  onAddNew,
  children,
  ...formControlProps
}) {
  const control = isValidElement(children) ? cloneElement(children, formControlProps) : children;

  if (!showFooter || !addNewLabel || !onAddNew) {
    return control;
  }

  return (
    <div className="lookup-field-composite">
      <div className="lookup-field-composite-control">{control}</div>
      <div className="lookup-field-add-footer">
        <Button type="link" className="lookup-field-add-link" onClick={onAddNew}>
          {addNewLabel}
        </Button>
      </div>
    </div>
  );
}
