import { withLocalePrefix } from "@/lib/locale-path";
import { hasBuyerPortalLinkStamp, salesInvoiceProofPortalPath } from "@/features/sales-invoices/utils/invoiceProofPortalUrl";

export function purchaseInvoiceProofPortalPath(invoiceId) {
  return `/proofs/purchases/${invoiceId}`;
}

export function purchaseInvoiceProofPortalAbsoluteUrl(invoiceId, locale, link) {
  if (typeof window === "undefined") return "";
  if (!hasBuyerPortalLinkStamp(link)) return "";
  const qs = new URLSearchParams({
    exp: String(link.exp),
    sig: String(link.sig).trim(),
  });
  return `${window.location.origin}${withLocalePrefix(locale, purchaseInvoiceProofPortalPath(invoiceId))}?${qs}`;
}

export { hasBuyerPortalLinkStamp, salesInvoiceProofPortalPath };
