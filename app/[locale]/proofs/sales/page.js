import { headers } from "next/headers";
import BuyerInvoiceHistoryPage from "@/features/sales-invoices/pages/BuyerInvoiceHistoryPage";

function forwardedHost(headerValue) {
  if (!headerValue) return "";
  return headerValue.split(",")[0].trim();
}

export default async function BuyerInvoiceHistoryRoute() {
  const h = await headers();
  const initialHost = forwardedHost(h.get("x-forwarded-host")) || h.get("host") || "";

  return <BuyerInvoiceHistoryPage initialHost={initialHost} />;
}
