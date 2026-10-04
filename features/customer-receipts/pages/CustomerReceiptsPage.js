"use client";

import PaymentDocumentPage from "@/features/payment-documents/components/PaymentDocumentPage";
import { customerReceiptConfig } from "../customerReceiptConfig";

export default function CustomerReceiptsPage() {
  return <PaymentDocumentPage config={customerReceiptConfig} />;
}
