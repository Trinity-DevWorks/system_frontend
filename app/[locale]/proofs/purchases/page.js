import { headers } from "next/headers";
import VendorInvoiceHistoryPage from "@/features/purchase-invoices/pages/VendorInvoiceHistoryPage";

function forwardedHost(headerValue) {
  if (!headerValue) return "";
  return headerValue.split(",")[0].trim();
}

export default async function VendorInvoiceHistoryRoute() {
  const h = await headers();
  const initialHost = forwardedHost(h.get("x-forwarded-host")) || h.get("host") || "";

  return <VendorInvoiceHistoryPage initialHost={initialHost} />;
}
