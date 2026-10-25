"use client";

import { APPROVE_BY_SUPPLIER_SELECTOR } from "@/lib/safe-company-approval-queue";
import { useSafeApprovalQueue } from "@/lib/useSafeApprovalQueue";
import { safeCompanyApprovalQueueQueryKey, salesInvoiceProofQueryKey } from "./salesInvoicesQueryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * @param {{
 *   invoiceId: string | null | undefined;
 *   proofResult: Record<string, unknown> | null;
 *   enabled?: boolean;
 * }} args
 */
export function useSafeCompanyApprovalQueue({ invoiceId, proofResult, enabled = true }) {
  const queryClient = useQueryClient();
  const status = typeof proofResult?.status === "string" ? proofResult.status : "";
  const onPendingCleared = useCallback(() => {
    if (invoiceId != null) {
      queryClient.invalidateQueries({ queryKey: salesInvoiceProofQueryKey(invoiceId) });
    }
  }, [invoiceId, queryClient]);

  return useSafeApprovalQueue({
    queryKey: safeCompanyApprovalQueueQueryKey(invoiceId),
    enabled: Boolean(enabled) && status === "waiting_company",
    chainId: Number(proofResult?.chain_id),
    txServiceUrl: typeof proofResult?.safe_tx_service_url === "string" ? proofResult.safe_tx_service_url : null,
    apiKey: typeof proofResult?.safe_api_key === "string" ? proofResult.safe_api_key : null,
    safeAddress: typeof proofResult?.supplier_wallet === "string" ? proofResult.supplier_wallet : "",
    contractAddress: typeof proofResult?.contract_address === "string" ? proofResult.contract_address : "",
    proofId:
      proofResult?.eip712 && typeof proofResult.eip712 === "object"
        ? /** @type {{ message?: { proof_id?: unknown } }} */ (proofResult.eip712).message?.proof_id
        : undefined,
    selector: APPROVE_BY_SUPPLIER_SELECTOR,
    onPendingCleared,
  });
}
