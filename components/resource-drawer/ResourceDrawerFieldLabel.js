"use client";

import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

/**
 * Label for vertical resource-drawer forms (item General tab, recipe yield, etc.).
 *
 * @param {{ text: string; required?: boolean; optional?: boolean; optionalSuffix?: string; help?: string }} props
 */
export default function ResourceDrawerFieldLabel({
  text,
  required,
  optional,
  optionalSuffix,
  help,
}) {
  return (
    <span className="item-general-form-label">
      {text}
      {required ? <span className="item-general-form-label-required"> *</span> : null}
      {optional && optionalSuffix ? (
        <span className="item-general-form-label-optional"> {optionalSuffix}</span>
      ) : null}
      {help ? (
        <Tooltip title={help}>
          <QuestionCircleOutlined className="item-general-form-label-help" aria-label={help} />
        </Tooltip>
      ) : null}
    </span>
  );
}
