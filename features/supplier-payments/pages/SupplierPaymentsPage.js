"use client";

import PaymentDocumentPage from "@/features/payment-documents/components/PaymentDocumentPage";
import { supplierPaymentConfig } from "../supplierPaymentConfig";

export default function SupplierPaymentsPage() {
  return <PaymentDocumentPage config={supplierPaymentConfig} />;
}
