"use client";

import { DownOutlined } from "@ant-design/icons";
import { Button, Popover } from "antd";
import { Children, useState } from "react";

/**
 * Collapses related footer actions into one button. A single action stays inline.
 *
 * @param {{ label: string; children: import("react").ReactNode }} props
 */
export default function InvoiceDrawerActionPopover({ label, children }) {
  const items = Children.toArray(children).filter(Boolean);
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  if (items.length === 1) {
    return <div className="invoice-drawer-footer-action-group">{items[0]}</div>;
  }

  return (
    <div className="invoice-drawer-footer-action-group">
      <Popover
        open={open}
        trigger="click"
        placement="topRight"
        destroyOnHidden={false}
        onOpenChange={setOpen}
        styles={{ container: { padding: 8 } }}
        content={
          <div
            className="invoice-drawer-footer-popover"
            onClick={(event) => {
              if (!(event.target instanceof Element)) return;
              const button = event.target.closest("button");
              if (!button || button.disabled || button.dataset.keepPopover === "true") return;
              const parent = button.parentElement;
              const direct = parent === event.currentTarget;
              const wrapped =
                parent?.parentElement === event.currentTarget && parent.classList.contains("inline-flex");
              if (!direct && !wrapped) return;
              setOpen(false);
            }}
          >
            {items}
          </div>
        }
      >
        <Button className="shrink-0" icon={<DownOutlined />} iconPlacement="end">
          {label}
        </Button>
      </Popover>
    </div>
  );
}
