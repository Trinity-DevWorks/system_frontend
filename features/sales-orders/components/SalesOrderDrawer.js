"use client";

import CommercialDocumentDrawer from "@/features/sales-documents/components/CommercialDocumentDrawer";
import { salesOrderConfig } from "../salesOrderConfig";

export default function SalesOrderDrawer(props) {
  return <CommercialDocumentDrawer {...props} config={salesOrderConfig} />;
}
