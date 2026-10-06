import { fetchInvoiceProofPortal } from "../api/salesInvoices.api";
import { invoiceProofPortalQueryKey } from "./salesInvoicesQueryKeys";
import { hasBuyerPortalLinkStamp } from "../utils/invoiceProofPortalUrl";
import { getApiErrorCode } from "@/lib/api-error-notify";
import { QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useQuery } from "@tanstack/react-query";

/**
 * @param {string | null | undefined} invoiceId
 * @param {{ exp?: unknown; sig?: unknown } | null | undefined} [link]
 * @param {(invoiceId: string, link: { exp?: unknown; sig?: unknown }) => Promise<unknown>} [fetcher]
 */
export function useInvoiceProofPortalQuery(invoiceId, link, fetcher = fetchInvoiceProofPortal) {
  const exp = link?.exp ?? null;
  const sig = typeof link?.sig === "string" ? link.sig.trim() : "";
  const enabled = Boolean(invoiceId) && hasBuyerPortalLinkStamp({ exp, sig });

  return useQuery({
    queryKey: [...invoiceProofPortalQueryKey(invoiceId, exp, sig || null), fetcher === fetchInvoiceProofPortal ? "sales" : "purchase"],
    queryFn: () =>
      fetcher(/** @type {string} */ (invoiceId), { exp, sig }),
    enabled,
    staleTime: QUERY_STALE_TIME.default,
    retry: (failureCount, error) => {
      const code = getApiErrorCode(error);
      if (
        code === "NOT_FOUND" ||
        code === "INVOICE_PROOFS_DISABLED" ||
        code === "PROOF_LINK_INVALID" ||
        code === "PROOF_LINK_EXPIRED"
      ) {
        return false;
      }
      return failureCount < 1;
    },
  });
}
