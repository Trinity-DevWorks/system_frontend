"use client";

import CreditDocumentDrawer from "@/features/credit-documents/components/CreditDocumentDrawer";
import { salesCreditNoteConfig } from "../../salesCreditNoteConfig";

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit" | "view";
 *   noteId: string | null;
 *   onClose: () => void;
 *   onCreated?: (record: Record<string, unknown>) => void;
 *   fromInvoiceId?: string | null;
 * }} props
 */
export default function SalesCreditNoteDrawer({ open, mode, noteId, onClose, onCreated, fromInvoiceId = null }) {
  return (
    <CreditDocumentDrawer
      open={open}
      mode={mode}
      documentId={noteId}
      onClose={onClose}
      onCreated={onCreated}
      fromInvoiceId={fromInvoiceId}
      config={salesCreditNoteConfig}
    />
  );
}
