"use client";

import CreditDocumentPage from "@/features/credit-documents/components/CreditDocumentPage";
import { salesCreditNoteConfig } from "../salesCreditNoteConfig";

export default function SalesCreditNotesPage() {
  return <CreditDocumentPage config={salesCreditNoteConfig} />;
}
