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
 * }} props
 */
export default function CustomerReceiptDrawer({ open, mode, receiptId, onClose, onCreated }) {
  return (
    <PaymentDocumentDrawer
      open={open}
      mode={mode}
      documentId={receiptId}
      onClose={onClose}
      onCreated={onCreated}
      config={customerReceiptConfig}
    />
  );
}
