import { headers } from "next/headers";
import InvoiceProofDisclosureVerifyPage from "@/features/sales-invoices/pages/InvoiceProofDisclosureVerifyPage";

function forwardedHost(headerValue) {
  if (!headerValue) return "";
  return headerValue.split(",")[0].trim();
}

export default async function InvoiceProofDisclosureVerifyRoute() {
  const h = await headers();
  const initialHost = forwardedHost(h.get("x-forwarded-host")) || h.get("host") || "";

  return <InvoiceProofDisclosureVerifyPage initialHost={initialHost} />;
}
