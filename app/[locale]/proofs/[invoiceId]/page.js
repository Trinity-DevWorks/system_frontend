import { headers } from "next/headers";
import { Suspense } from "react";
import InvoiceProofPortalPage from "@/features/sales-invoices/pages/InvoiceProofPortalPage";

function forwardedHost(headerValue) {
  if (!headerValue) return "";
  return headerValue.split(",")[0].trim();
}

export default async function InvoiceProofPortalRoute({ params }) {
  const { invoiceId } = await params;
  const h = await headers();
  const initialHost =
    forwardedHost(h.get("x-forwarded-host")) || h.get("host") || "";

  return (
    <Suspense fallback={null}>
      <InvoiceProofPortalPage invoiceId={invoiceId} initialHost={initialHost} />
    </Suspense>
  );
}
