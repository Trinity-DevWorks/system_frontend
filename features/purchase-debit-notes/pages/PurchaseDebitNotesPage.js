"use client";

import CreditDocumentPage from "@/features/credit-documents/components/CreditDocumentPage";
import { purchaseDebitNoteConfig } from "../purchaseDebitNoteConfig";

export default function PurchaseDebitNotesPage() {
  return <CreditDocumentPage config={purchaseDebitNoteConfig} />;
}
