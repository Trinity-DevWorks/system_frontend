import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   customer_id?: string;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchSalesInvoices(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `sales-invoices?${qs}` : "sales-invoices");
  return parsePaginatedList(payload, params);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createSalesInvoice(body) {
  return tenantRequest("POST", "sales-invoices", body);
}

/**
 * @param {string} invoiceId
 */
export function fetchSalesInvoice(invoiceId) {
  return tenantRequest("GET", `sales-invoices/${invoiceId}`);
}

/**
 * @param {string} invoiceId
 * @param {Record<string, unknown>} body
 */
export function updateSalesInvoice(invoiceId, body) {
  return tenantRequest("PUT", `sales-invoices/${invoiceId}`, body);
}

/**
 * @param {string} invoiceId
 */
export function deleteSalesInvoice(invoiceId) {
  return tenantRequest("DELETE", `sales-invoices/${invoiceId}`);
}

/**
 * @param {string} invoiceId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 * @returns {Promise<{ lines?: unknown[]; invoice?: Record<string, unknown> }>}
 */
export async function syncSalesInvoiceLines(invoiceId, body) {
  const data = await tenantRequest("PUT", `sales-invoices/${invoiceId}/lines/sync`, body);
  if (data && typeof data === "object") {
    return /** @type {{ lines?: unknown[]; invoice?: Record<string, unknown> }} */ (data);
  }
  return {};
}

/**
 * @param {string} invoiceId
 */
export function postSalesInvoice(invoiceId) {
  return tenantRequest("POST", `sales-invoices/${invoiceId}/post`);
}

/** @param {string} invoiceId */
export function reverseSalesInvoice(invoiceId) {
  return tenantRequest("POST", `sales-invoices/${invoiceId}/reverse`);
}

/** @param {string} invoiceId */
export function reissueSalesInvoice(invoiceId) {
  return tenantRequest("POST", `sales-invoices/${invoiceId}/reissue`);
}

/**
 * @param {string} invoiceId
 * @returns {Promise<{
 *   status?: string;
 *   snapshot_intact?: boolean | null;
 *   live_invoice_matches?: boolean | null; // diagnostic; does not change status
 *   chain_matches?: boolean | null;
 *   chain_id?: number | null;
 *   contract_address?: string | null;
 *   supplier_wallet?: string | null;
 *   buyer_wallet?: string | null;
 *   proof_id?: string | null;
 *   eip712?: {
 *     domain?: { name?: string; version?: string; chain_id?: number; verifying_contract?: string };
 *     primary_type?: string;
 *     types?: Record<string, Array<{ name: string, type: string }>>;
 *     message?: { proof_id?: string; content_hash?: string; invoice_number?: string; statement?: string };
 *   } | null;
 *   can_approve_as_company?: boolean;
 *   can_approve_as_buyer?: boolean;
 *   blockchain_network?: string | null;
 *   safe_tx_service_url?: string | null;
 *   safe_api_key?: string | null;
 *   registered_at?: string | null;
 *   supplier_approved_at?: string | null;
 *   buyer_approved_at?: string | null;
 *   revoked_at?: string | null;
 *   disputed_at?: string | null;
 *   dispute_reason?: string | null;
 *   attestations?: Array<{
 *     verifier: string;
 *     verifier_name: string | null;
 *     role: "auditor" | "tax_authority" | "financier";
 *     reference_hash: string | null;
 *     attested_at: string | null;
 *   }>;
 *   financed_by?: string | null;
 * }>}
 */
export function verifySalesInvoice(invoiceId) {
  return tenantRequest("GET", `sales-invoices/${invoiceId}/verify`);
}

/**
 * Public buyer portal (no ERP session). Tenant host + invoice UUID + HMAC stamp.
 * GET returns a locked personal_sign challenge. POST unlock returns the sealed snapshot.
 * @param {string} invoiceId
 * @param {{ exp?: unknown; sig?: unknown }} [link]
 * @returns {Promise<{
 *   locked?: boolean;
 *   chain_id?: number | null;
 *   buyer_wallet?: string | null;
 *   nonce?: string;
 *   message?: string;
 *   id?: string;
 *   company_name?: string;
 *   customer_name?: string | null;
 *   invoice_number?: string | null;
 *   invoice_date?: string | null;
 *   due_on?: string | null;
 *   subtotal?: string;
 *   discount_total?: string;
 *   tax_total?: string;
 *   adjustment?: string;
 *   grand_total?: string;
 *   net_to_pay?: string;
 *   currency_code?: string | null;
 *   currency_symbol?: string | null;
 *   status?: string;
 *   content_hash?: string | null;
 *   lines?: Array<{
 *     item_name?: string | null;
 *     description?: string | null;
 *     item_code?: string | null;
 *     quantity?: string;
 *     uom?: string | null;
 *     unit_price?: string;
 *     discount_percent?: string;
 *     tax_rate?: string;
 *     line_total?: string;
 *   }>;
 *   chain_id?: number | null;
 *   contract_address?: string | null;
 *   buyer_wallet?: string | null;
 *   proof_id?: string | null;
 *   eip712?: {
 *     domain?: { name?: string; version?: string; chain_id?: number; verifying_contract?: string };
 *     primary_type?: string;
 *     types?: { BuyerApproval?: Array<{ name: string, type: string }> };
 *     message?: { proof_id?: string; content_hash?: string; invoice_number?: string; statement?: string };
 *   } | null;
 *   can_approve_as_buyer?: boolean;
 *   registered_at?: string | null;
 *   supplier_approved_at?: string | null;
 *   buyer_approved_at?: string | null;
 * }>}
 */
export function fetchBuyerInvoiceHistoryChallenge() {
  return tenantRequest("GET", "proofs/history");
}

/**
 * @param {{ address: string; signature: string; nonce: string }} body
 */
export function unlockBuyerInvoiceHistory(body) {
  return tenantRequest("POST", "proofs/history", body);
}

export function fetchInvoiceProofPortal(invoiceId, link = {}) {
  const qs = new URLSearchParams();
  if (link.exp != null && String(link.exp) !== "") qs.set("exp", String(link.exp));
  if (typeof link.sig === "string" && link.sig.trim() !== "") qs.set("sig", link.sig.trim());
  const query = qs.toString();
  return tenantRequest("GET", query ? `proofs/${invoiceId}?${query}` : `proofs/${invoiceId}`);
}

/**
 * Unlock the buyer portal with personal_sign of the GET challenge.
 * @param {string} invoiceId
 * @param {{ exp?: unknown; sig?: unknown }} [link]
 * @param {{ address: string; signature: string }} body
 */
/**
 * Open an invoice already unlocked by this wallet in the current browser session.
 * @param {string} invoiceId
 * @param {{ exp?: unknown; sig?: unknown }} [link]
 * @param {{ session: string; address: string }} body
 */
export function resumeInvoiceProofPortal(invoiceId, link = {}, body) {
  const qs = new URLSearchParams();
  if (link.exp != null && String(link.exp) !== "") qs.set("exp", String(link.exp));
  if (typeof link.sig === "string" && link.sig.trim() !== "") qs.set("sig", link.sig.trim());
  const query = qs.toString();
  return tenantRequest(
    "POST",
    query ? `proofs/${invoiceId}/resume?${query}` : `proofs/${invoiceId}/resume`,
    { session: body.session, address: body.address },
  );
}

export function unlockInvoiceProofPortal(invoiceId, link = {}, body) {
  const qs = new URLSearchParams();
  if (link.exp != null && String(link.exp) !== "") qs.set("exp", String(link.exp));
  if (typeof link.sig === "string" && link.sig.trim() !== "") qs.set("sig", link.sig.trim());
  const query = qs.toString();
  return tenantRequest(
    "POST",
    query ? `proofs/${invoiceId}/unlock?${query}` : `proofs/${invoiceId}/unlock`,
    {
      address: body.address,
      signature: body.signature,
    },
  );
}

/**
 * Record the buyer dispute reason after it is hashed on chain.
 * @param {string} invoiceId
 * @param {{ exp?: unknown; sig?: unknown }} [link]
 * @param {{ reason: string; tx_hash?: string }} body
 */
export function recordInvoiceProofDispute(invoiceId, link = {}, body) {
  const qs = new URLSearchParams();
  if (link.exp != null && String(link.exp) !== "") qs.set("exp", String(link.exp));
  if (typeof link.sig === "string" && link.sig.trim() !== "") qs.set("sig", link.sig.trim());
  const query = qs.toString();
  return tenantRequest(
    "POST",
    query ? `proofs/${invoiceId}/dispute?${query}` : `proofs/${invoiceId}/dispute`,
    {
      reason: body.reason,
      ...(typeof body.tx_hash === "string" && body.tx_hash !== "" ? { tx_hash: body.tx_hash } : {}),
    },
  );
}

/**
 * Clerk-issued HMAC buyer-portal stamp. The browser path is `/proofs/sales/{id}?exp=&sig=`.
 * @param {string} invoiceId
 * @returns {Promise<{ url?: string; exp?: number; sig?: string }>}
 */
export function createBuyerPortalLink(invoiceId) {
  return tenantRequest("POST", `sales-invoices/${invoiceId}/buyer-portal-link`);
}

/**
 * Every disclosable leaf of the sealed snapshot, in Merkle tree order.
 * @param {string} invoiceId
 * @returns {Promise<{
 *   proof_id?: string;
 *   content_hash?: string;
 *   schema_version?: number;
 *   leaf_count?: number;
 *   fields?: Array<{ path: string; value: string | number | boolean | null | [] }>;
 * }>}
 */
export function fetchSalesInvoiceProofFields(invoiceId) {
  return tenantRequest("GET", `sales-invoices/${invoiceId}/proof-fields`);
}

/**
 * Selective-disclosure bundle for the chosen leaf paths (`invoice-proof-disclosure`).
 * @param {string} invoiceId
 * @param {string[]} fields
 * @returns {Promise<import("@/lib/invoice-proof-merkle").InvoiceProofDisclosureBundle>}
 */
export function createSalesInvoiceProofDisclosure(invoiceId, fields) {
  return tenantRequest("POST", `sales-invoices/${invoiceId}/proof-disclosure`, { fields });
}

/**
 * Warehouses (and lots) that currently hold the item.
 * @param {string} itemId
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchSalesInvoiceItemAvailability(itemId) {
  const data = await tenantRequest(
    "GET",
    `sales-invoices/item-availability?item_id=${encodeURIComponent(itemId)}`,
  );
  return Array.isArray(data) ? data : [];
}
