"use client";

import CommercialDocumentsPage from "@/features/sales-documents/components/CommercialDocumentsPage";
import { salesOrderConfig } from "../salesOrderConfig";

export default function SalesOrdersPage() {
  return <CommercialDocumentsPage config={salesOrderConfig} />;
}
