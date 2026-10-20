"use client";

import CommercialDocumentsPage from "@/features/sales-documents/components/CommercialDocumentsPage";
import { salesQuotationConfig } from "../salesQuotationConfig";

export default function SalesQuotationsPage() {
  return <CommercialDocumentsPage config={salesQuotationConfig} />;
}
