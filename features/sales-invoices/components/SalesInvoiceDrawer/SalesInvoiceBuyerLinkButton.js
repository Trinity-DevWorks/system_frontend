"use client";

import { Button, Popover } from "antd";
import { useState } from "react";
import SalesInvoiceBuyerLinkPanel from "./SalesInvoiceBuyerLinkPanel";

/**
 * @param {{
 *   invoiceId: string;
 *   invoiceNumber?: string | null;
 *   disabled?: boolean;
 *   t: (key: string) => string;
 * }} props
 */
export default function SalesInvoiceBuyerLinkButton({
  invoiceId,
  invoiceNumber = null,
  disabled = false,
  t,
  actionLabel,
  issueLink,
  absoluteUrl,
  copySuccessKey,
  copyErrorKey,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      trigger="click"
      placement="topRight"
      destroyOnHidden
      content={
        <SalesInvoiceBuyerLinkPanel
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          t={t}
          issueLink={issueLink}
          absoluteUrl={absoluteUrl}
          copySuccessKey={copySuccessKey}
          copyErrorKey={copyErrorKey}
        />
      }
      onOpenChange={setOpen}
    >
      <Button className="shrink-0" disabled={disabled}>
        {actionLabel ?? t("actionBuyerLink")}
      </Button>
    </Popover>
  );
}
