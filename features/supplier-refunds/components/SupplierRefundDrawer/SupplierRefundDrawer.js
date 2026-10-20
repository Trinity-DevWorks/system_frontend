"use client";

import PaymentDocumentDrawer from "@/features/payment-documents/components/PaymentDocumentDrawer";
import { supplierRefundConfig } from "../../supplierRefundConfig";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   refundId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   fromInvoiceId?: string | null;
 * }} props
 */
export default function SupplierRefundDrawer({ open, mode, refundId, onClose, onCreated, fromInvoiceId = null }) {
  return (
    <PaymentDocumentDrawer
      open={open}
      mode={mode}
      documentId={refundId}
      onClose={onClose}
      onCreated={onCreated}
      fromInvoiceId={fromInvoiceId}
      config={supplierRefundConfig}
    />
  );
}
