"use client";

import { Modal } from "antd";
import SalesInvoiceBuyerLinkPanel from "./SalesInvoiceBuyerLinkPanel";

/**
 * Buyer-portal link and QR for list rows, same panel as the drawer popover.
 *
 * @param {{
 *   open: boolean;
 *   invoiceId: string | null;
 *   invoiceNumber?: string | null;
 *   onClose: () => void;
 *   t: (key: string) => string;
 *   actionLabel?: string;
 *   issueLink?: (invoiceId: string) => Promise<{ token: string; expires_at: string }>;
 *   absoluteUrl?: (invoiceId: string, locale: string, token?: { token: string; expires_at: string }) => string;
 *   copySuccessKey?: string;
 *   copyErrorKey?: string;
 * }} props
 */
export default function SalesInvoiceBuyerLinkModal({
  open,
  invoiceId,
  invoiceNumber = null,
  onClose,
  t,
  actionLabel,
  issueLink,
  absoluteUrl,
  copySuccessKey,
  copyErrorKey,
}) {
  const title = actionLabel ?? t("actionBuyerLink");
  return (
    <Modal
      open={open && invoiceId != null}
      title={invoiceNumber ? `${title} · ${invoiceNumber}` : title}
      onCancel={onClose}
      footer={null}
      width={320}
      centered
      destroyOnHidden
    >
      {invoiceId != null ? (
        <div className="flex justify-center">
          <SalesInvoiceBuyerLinkPanel
            invoiceId={invoiceId}
            invoiceNumber={invoiceNumber}
            t={t}
            issueLink={issueLink}
            absoluteUrl={absoluteUrl}
            copySuccessKey={copySuccessKey}
            copyErrorKey={copyErrorKey}
          />
        </div>
      ) : null}
    </Modal>
  );
}
