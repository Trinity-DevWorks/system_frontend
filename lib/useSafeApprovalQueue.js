"use client";

import {
  APPROVE_BY_SUPPLIER_SELECTOR,
  SEPOLIA_CHAIN_ID,
  fetchSafeCompanyApprovalQueue,
} from "@/lib/safe-company-approval-queue";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * @returns {Promise<string>}
 */
async function readConnectedAccountQuiet() {
  if (typeof window === "undefined" || !window.ethereum || typeof window.ethereum.request !== "function") {
    return "";
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    return Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  } catch {
    return "";
  }
}

/**
 * Live Safe Transaction Service queue for one pending call (N of M confirmations).
 *
 * @param {{
 *   queryKey: unknown[];
 *   enabled?: boolean;
 *   chainId?: number;
 *   txServiceUrl?: string | null;
 *   apiKey?: string | null;
 *   safeAddress?: string;
 *   contractAddress?: string;
 *   proofId?: unknown;
 *   selector?: string;
 *   onPendingCleared?: () => void;
 * }} args
 */
export function useSafeApprovalQueue({
  queryKey,
  enabled = true,
  chainId,
  txServiceUrl,
  apiKey,
  safeAddress = "",
  contractAddress = "",
  proofId,
  selector = APPROVE_BY_SUPPLIER_SELECTOR,
  onPendingCleared,
}) {
  const queryClient = useQueryClient();
  const hadPendingRef = useRef(false);
  const numericChainId = Number(chainId);
  const canQuery =
    Boolean(enabled) &&
    Number.isFinite(numericChainId) &&
    numericChainId === SEPOLIA_CHAIN_ID &&
    safeAddress !== "" &&
    contractAddress !== "";

  useEffect(() => {
    hadPendingRef.current = false;
  }, [safeAddress, contractAddress, selector, String(proofId ?? "")]);

  const query = useQuery({
    queryKey,
    enabled: canQuery,
    queryFn: async () => {
      const connected = await readConnectedAccountQuiet();
      return fetchSafeCompanyApprovalQueue({
        chainId: numericChainId,
        txServiceUrl,
        apiKey,
        safeAddress,
        contractAddress,
        proofId,
        connected,
        selector,
      });
    },
    staleTime: 4_000,
    refetchInterval: canQuery ? 10_000 : false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!canQuery || typeof window === "undefined") return undefined;
    const ethereum = window.ethereum;
    if (!ethereum || typeof ethereum.on !== "function") return undefined;
    const onAccountsChanged = () => {
      queryClient.invalidateQueries({ queryKey });
    };
    ethereum.on("accountsChanged", onAccountsChanged);
    return () => {
      if (typeof ethereum.removeListener === "function") {
        ethereum.removeListener("accountsChanged", onAccountsChanged);
      }
    };
  }, [canQuery, queryClient, queryKey]);

  useEffect(() => {
    const hasPending = Boolean(query.data?.safeTxHash);
    if (hadPendingRef.current && !hasPending && canQuery) {
      onPendingCleared?.();
    }
    hadPendingRef.current = hasPending;
  }, [canQuery, onPendingCleared, query.data]);

  const pendingQueue = canQuery && query.data?.safeTxHash ? query.data : null;
  return { ...query, data: pendingQueue };
}
