"use client";

import CommercialDocumentDrawer from "@/features/sales-documents/components/CommercialDocumentDrawer";
import { salesQuotationConfig } from "../salesQuotationConfig";

export default function SalesQuotationDrawer(props) {
  return <CommercialDocumentDrawer {...props} config={salesQuotationConfig} />;
}
