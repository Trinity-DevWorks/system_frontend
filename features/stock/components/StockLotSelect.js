"use client";

import { drawerSelectGetPopup } from "@/shared/components/resource-drawer/drawerFormUtils";
import { Select, Tooltip } from "antd";
import { useMemo } from "react";

/**
 * Lot select that shows only the lot number; expiry and on-hand appear on hover.
 *
 * @param {import("antd").SelectProps} props
 */
export default function StockLotSelect({ options = [], ...rest }) {
  const titleByValue = useMemo(() => {
    const map = new Map();
    for (const option of options) {
      if (option?.tooltip) map.set(option.value, option.tooltip);
    }
    return map;
  }, [options]);

  /**
   * @param {import("react").ReactNode} label
   * @param {unknown} title
   */
  const withHover = (label, title) => {
    const node = <span className="block truncate">{label}</span>;
    if (!title) return node;
    return (
      <Tooltip title={title} getPopupContainer={() => document.body}>
        {node}
      </Tooltip>
    );
  };

  return (
    <Select
      showSearch
      optionFilterProp="label"
      className="w-full"
      allowClear
      getPopupContainer={drawerSelectGetPopup}
      {...rest}
      options={options}
      optionRender={(option) => withHover(option.label, option.data?.tooltip)}
      labelRender={(props) => withHover(props.label, titleByValue.get(props.value))}
    />
  );
}
