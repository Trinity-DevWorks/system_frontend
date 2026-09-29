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
 * }} props
 */
export default function SalesInvoiceBuyerLinkModal({ open, invoiceId, invoiceNumber = null, onClose, t }) {
  return (
    <Modal
      open={open && invoiceId != null}
      title={invoiceNumber ? `${t("actionBuyerLink")} · ${invoiceNumber}` : t("actionBuyerLink")}
      onCancel={onClose}
      footer={null}
      width={320}
      centered
      destroyOnHidden
    >
      {invoiceId != null ? (
        <div className="flex justify-center">
          <SalesInvoiceBuyerLinkPanel invoiceId={invoiceId} invoiceNumber={invoiceNumber} t={t} />
        </div>
      ) : null}
    </Modal>
  );
}
