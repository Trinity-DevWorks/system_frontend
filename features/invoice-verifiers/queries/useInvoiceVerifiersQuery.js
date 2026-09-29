"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInvoiceVerifiers } from "../api/invoiceVerifiers.api";
import { hasSyncingVerifier } from "../utils/invoiceVerifierDrawerUtils";
import { INVOICE_VERIFIERS_LIST_QUERY_KEY } from "./invoiceVerifiersQueryKeys";

const POLL_INTERVAL_MS = 3000;

/**
 * All verifiers (small list, no pagination). Polls while any row is still being
 * written to or removed from the blockchain.
 *
 * @param {{ enabled?: boolean }} [options]
 */
export function useInvoiceVerifiersQuery({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: INVOICE_VERIFIERS_LIST_QUERY_KEY,
    queryFn: fetchInvoiceVerifiers,
    enabled,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => {
      const rows = Array.isArray(q.state.data) ? q.state.data : [];
      return hasSyncingVerifier(rows) ? POLL_INTERVAL_MS : false;
    },
  });

  return {
    ...query,
    rows: /** @type {import("../api/invoiceVerifiers.api").InvoiceVerifier[]} */ (
      Array.isArray(query.data) ? query.data : []
    ),
  };
}
