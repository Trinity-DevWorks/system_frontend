"use client";

import { Tabs, Typography } from "antd";

/**
 * Line-style tabs for resource drawers with optional panel heading + description under the tab bar.
 *
 * @param {{
 *   activeKey: string;
 *   onChange: (key: string) => void;
 *   items: {
 *     key: string;
 *     label: import("react").ReactNode;
 *     children: import("react").ReactNode;
 *     panelDescription?: string;
 *     hidePanelHeading?: boolean;
 *     disabled?: boolean;
 *   }[];
 *   destroyInactiveTabPane?: boolean;
 * }} props
 */
export default function ResourceDrawerTabs({
  activeKey,
  onChange,
  items,
  destroyInactiveTabPane = false,
}) {
  const mappedItems = items.map((item) => {
    const showHeading = !item.hidePanelHeading;
    const description = item.panelDescription?.trim();

    return {
      key: item.key,
      label: item.label,
      disabled: item.disabled,
      children: (
        <div className="resource-drawer-tab-panel">
          {showHeading ? (
            <div className="mb-5">
              <Typography.Title level={5} className="!mb-1 !text-base !font-semibold">
                {item.label}
              </Typography.Title>
              {description ? (
                <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
                  {description}
                </Typography.Paragraph>
              ) : null}
            </div>
          ) : null}
          {item.children}
        </div>
      ),
    };
  });

  return (
    <Tabs
      className="resource-drawer-tabs"
      activeKey={activeKey}
      onChange={onChange}
      destroyOnHidden={destroyInactiveTabPane}
      items={mappedItems}
    />
  );
}
