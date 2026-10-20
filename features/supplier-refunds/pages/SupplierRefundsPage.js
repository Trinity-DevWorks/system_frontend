"use client";

import PaymentDocumentPage from "@/features/payment-documents/components/PaymentDocumentPage";
import { supplierRefundConfig } from "../supplierRefundConfig";

export default function SupplierRefundsPage() {
  return <PaymentDocumentPage config={supplierRefundConfig} />;
}
