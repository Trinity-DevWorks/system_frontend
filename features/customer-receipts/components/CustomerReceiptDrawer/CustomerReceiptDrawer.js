"use client";

import PaymentDocumentDrawer from "@/features/payment-documents/components/PaymentDocumentDrawer";
import { customerReceiptConfig } from "../../customerReceiptConfig";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   receiptId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   fromInvoiceId?: string | null;
 * }} props
 */
export default function CustomerReceiptDrawer({ open, mode, receiptId, onClose, onCreated, fromInvoiceId = null }) {
  return (
    <PaymentDocumentDrawer
      open={open}
      mode={mode}
      documentId={receiptId}
      onClose={onClose}
      onCreated={onCreated}
      fromInvoiceId={fromInvoiceId}
      config={customerReceiptConfig}
    />
  );
}
