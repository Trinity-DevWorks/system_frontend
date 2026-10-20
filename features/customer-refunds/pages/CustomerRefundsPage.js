"use client";

import PaymentDocumentPage from "@/features/payment-documents/components/PaymentDocumentPage";
import { customerRefundConfig } from "../customerRefundConfig";

export default function CustomerRefundsPage() {
  return <PaymentDocumentPage config={customerRefundConfig} />;
}
