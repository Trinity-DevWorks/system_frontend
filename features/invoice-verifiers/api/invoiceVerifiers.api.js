import { tenantRequest } from "@/lib/axios";

/**
 * Company verifiers (banks, auditors, tax authorities) allowed to attest invoices on chain.
 * Aligns with GET/POST invoice-verifiers, GET/PUT/DELETE invoice-verifiers/{id}, POST invoice-verifiers/{id}/sync.
 */

/**
 * @typedef {{
 *   id: string;
 *   name: string;
 *   role: "auditor" | "tax_authority" | "financier";
 *   party_side: "supplier" | "buyer";
 *   wallet_address: string;
 *   wallet_type: "wallet" | "safe";
 *   email: string | null;
 *   phone: string | null;
 *   notes: string | null;
 *   chain_status: "pending" | "active" | "failed" | "removing";
 *   chain_company_wallet: string | null;
 *   chain_tx_hash: string | null;
 *   chain_error: string | null;
 *   chain_synced_at: string | null;
 *   created_at: string | null;
 *   updated_at: string | null;
 * }} InvoiceVerifier
 */

/**
 * @returns {Promise<InvoiceVerifier[]>}
 */
export function fetchInvoiceVerifiers() {
  return tenantRequest("GET", "invoice-verifiers");
}

/**
 * @param {string} id
 * @returns {Promise<InvoiceVerifier>}
 */
export function fetchInvoiceVerifier(id) {
  return tenantRequest("GET", `invoice-verifiers/${encodeURIComponent(id)}`);
}

/**
 * @param {{ name: string; role: string; wallet_address: string; wallet_type: "wallet" | "safe"; email: string | null; phone: string | null; notes: string | null }} body
 * @returns {Promise<InvoiceVerifier>}
 */
export function createInvoiceVerifier(body) {
  return tenantRequest("POST", "invoice-verifiers", body);
}

/**
 * @param {string} id
 * @param {{ name: string; role: string; email: string | null; phone: string | null; notes: string | null }} body
 * @returns {Promise<InvoiceVerifier>}
 */
export function updateInvoiceVerifier(id, body) {
  return tenantRequest("PUT", `invoice-verifiers/${encodeURIComponent(id)}`, body);
}

/**
 * @param {string} id
 */
export function deleteInvoiceVerifier(id) {
  return tenantRequest("DELETE", `invoice-verifiers/${encodeURIComponent(id)}`);
}

/**
 * @param {string} id
 * @returns {Promise<InvoiceVerifier>}
 */
export function syncInvoiceVerifier(id) {
  return tenantRequest("POST", `invoice-verifiers/${encodeURIComponent(id)}/sync`);
}
