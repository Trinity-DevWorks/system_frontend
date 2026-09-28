import { tenantRequest } from "@/lib/axios";

/**
 * Chain consistency check: sealed invoices compared with InvoiceRegistry.
 * Aligns with GET/POST invoice-proofs/chain-check.
 */

/**
 * @typedef {{
 *   id: string;
 *   kind:
 *     | "snapshot_altered"
 *     | "missing_on_chain"
 *     | "hash_mismatch"
 *     | "other_contract"
 *     | "status_out_of_sync"
 *     | "registration_stuck"
 *     | "not_submitted"
 *     | "unknown_on_chain";
 *   proof_id: string | null;
 *   chain_proof_id: string | null;
 *   invoice_id: string | null;
 *   invoice_number: string | null;
 *   expected: string | null;
 *   actual: string | null;
 * }} InvoiceChainCheckIssue
 */

/**
 * @typedef {{
 *   id: string;
 *   status: "consistent" | "issues" | "failed";
 *   blockchain_network: string;
 *   contract_address: string;
 *   checked_count: number;
 *   issue_count: number;
 *   requeued_count: number;
 *   scanned_from_block: number | null;
 *   scanned_to_block: number | null;
 *   error: string | null;
 *   started_at: string | null;
 *   finished_at: string | null;
 *   issues: InvoiceChainCheckIssue[];
 * }} InvoiceChainCheck
 */

/**
 * @typedef {{ available: boolean; check: InvoiceChainCheck | null }} InvoiceChainCheckState
 */

/**
 * @returns {Promise<InvoiceChainCheckState>}
 */
export function fetchInvoiceChainCheck() {
  return tenantRequest("GET", "invoice-proofs/chain-check");
}

/**
 * @returns {Promise<InvoiceChainCheckState>}
 */
export function runInvoiceChainCheck() {
  return tenantRequest("POST", "invoice-proofs/chain-check");
}
