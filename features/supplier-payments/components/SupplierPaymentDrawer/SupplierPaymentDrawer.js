"use client";

import PaymentDocumentDrawer from "@/features/payment-documents/components/PaymentDocumentDrawer";
import { supplierPaymentConfig } from "../../supplierPaymentConfig";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   paymentId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   fromInvoiceId?: string | null;
 * }} props
 */
export default function SupplierPaymentDrawer({ open, mode, paymentId, onClose, onCreated, fromInvoiceId = null }) {
  return (
    <PaymentDocumentDrawer
      open={open}
      mode={mode}
      documentId={paymentId}
      onClose={onClose}
      onCreated={onCreated}
      fromInvoiceId={fromInvoiceId}
      config={supplierPaymentConfig}
    />
  );
}
