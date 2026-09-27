import { withLocalePrefix } from "@/lib/locale-path";

/**
 * @param {string} invoiceId
 */
export function salesInvoiceProofPortalPath(invoiceId) {
  return `/proofs/${invoiceId}`;
}

/**
 * @param {{ exp?: unknown; sig?: unknown } | null | undefined} link
 */
export function hasBuyerPortalLinkStamp(link) {
  const exp = link?.exp;
  const sig = typeof link?.sig === "string" ? link.sig.trim() : "";
  if (sig === "") return false;
  if (exp == null || exp === "") return false;
  const n = Number(exp);
  return Number.isFinite(n) && n > 0;
}

/**
 * Absolute URL clerks copy for the buyer. Requires HMAC `exp` + `sig` from
 * POST sales-invoices/{id}/buyer-portal-link.
 *
 * @param {string} invoiceId
 * @param {string} locale
 * @param {{ exp?: unknown; sig?: unknown } | null | undefined} [link]
 */
export function salesInvoiceProofPortalAbsoluteUrl(invoiceId, locale, link) {
  if (typeof window === "undefined") return "";
  if (!hasBuyerPortalLinkStamp(link)) return "";
  const qs = new URLSearchParams({
    exp: String(link.exp),
    sig: String(link.sig).trim(),
  });
  return `${window.location.origin}${withLocalePrefix(locale, salesInvoiceProofPortalPath(invoiceId))}?${qs}`;
}
