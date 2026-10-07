import { tenantRequest } from "@/lib/axios";
import { parsePaginatedList, toListQuery } from "@/lib/tables/paginatedList";

/**
 * @param {{
 *   status?: string;
 *   supplier_id?: string;
 *   search?: string;
 *   from?: string;
 *   to?: string;
 *   page?: number;
 *   per_page?: number;
 * }} [params]
 */
export async function fetchPurchaseInvoices(params = {}) {
  const qs = toListQuery(params).toString();
  const payload = await tenantRequest("GET", qs ? `purchase-invoices?${qs}` : "purchase-invoices");
  return parsePaginatedList(payload, params);
}

/**
 * @param {string} invoiceId
 */
export function fetchPurchaseInvoice(invoiceId) {
  return tenantRequest("GET", `purchase-invoices/${invoiceId}`);
}

/**
 * @param {Record<string, unknown>} body
 */
export function createPurchaseInvoice(body) {
  return tenantRequest("POST", "purchase-invoices", body);
}

/**
 * @param {string} invoiceId
 * @param {Record<string, unknown>} body
 */
export function updatePurchaseInvoice(invoiceId, body) {
  return tenantRequest("PUT", `purchase-invoices/${invoiceId}`, body);
}

/**
 * @param {string} invoiceId
 */
export function deletePurchaseInvoice(invoiceId) {
  return tenantRequest("DELETE", `purchase-invoices/${invoiceId}`);
}

/**
 * @param {string} invoiceId
 * @param {{ lines: Array<Record<string, unknown>> }} body
 */
export async function syncPurchaseInvoiceLines(invoiceId, body) {
  const data = await tenantRequest("PUT", `purchase-invoices/${invoiceId}/lines/sync`, body);
  if (data && typeof data === "object") {
    return /** @type {{ lines?: unknown[]; invoice?: Record<string, unknown> }} */ (data);
  }
  return {};
}

/**
 * @param {string} invoiceId
 */
export function postPurchaseInvoice(invoiceId) {
  return tenantRequest("POST", `purchase-invoices/${invoiceId}/post`);
}

/** @param {string} invoiceId */
export function reversePurchaseInvoice(invoiceId) {
  return tenantRequest("POST", `purchase-invoices/${invoiceId}/reverse`);
}

/** @param {string} invoiceId */
export function reissuePurchaseInvoice(invoiceId) {
  return tenantRequest("POST", `purchase-invoices/${invoiceId}/reissue`);
}

/** @param {string} invoiceId */
export function verifyPurchaseInvoice(invoiceId) {
  return tenantRequest("GET", `purchase-invoices/${invoiceId}/verify`);
}

/** @param {string} invoiceId */
export function createVendorPortalLink(invoiceId) {
  return tenantRequest("POST", `purchase-invoices/${invoiceId}/vendor-portal-link`);
}

/** @param {string} invoiceId */
export function fetchPurchaseInvoiceProofFields(invoiceId) {
  return tenantRequest("GET", `purchase-invoices/${invoiceId}/proof-fields`);
}

/**
 * @param {string} invoiceId
 * @param {string[]} fields
 */
export function createPurchaseInvoiceProofDisclosure(invoiceId, fields) {
  return tenantRequest("POST", `purchase-invoices/${invoiceId}/proof-disclosure`, { fields });
}

/**
 * @param {string} invoiceId
 * @param {{ reason: string; tx_hash?: string }} body
 */
export function recordPurchaseInvoiceDispute(invoiceId, body) {
  return tenantRequest("POST", `purchase-invoices/${invoiceId}/dispute`, {
    reason: body.reason,
    ...(typeof body.tx_hash === "string" && body.tx_hash !== "" ? { tx_hash: body.tx_hash } : {}),
  });
}

/**
 * Chain preview for a supplier sales-invoice proof before it is linked.
 * @param {string} proofId
 */
export function fetchLinkedPurchaseProof(proofId) {
  return tenantRequest("GET", `purchase-invoices/linked-proofs/${proofId}`);
}

/**
 * Fill a purchase invoice from a supplier disclosure file.
 * @param {Record<string, unknown>} disclosure
 */
export function importLinkedPurchaseProof(disclosure) {
  return tenantRequest("POST", "purchase-invoices/linked-proofs/import", { disclosure });
}

/**
 * @param {string} invoiceId
 * @param {{ exp?: unknown; sig?: unknown }} [link]
 */
export function fetchPurchaseProofPortal(invoiceId, link = {}) {
  const qs = new URLSearchParams();
  if (link.exp != null && String(link.exp) !== "") qs.set("exp", String(link.exp));
  if (typeof link.sig === "string" && link.sig.trim() !== "") qs.set("sig", link.sig.trim());
  const query = qs.toString();
  return tenantRequest("GET", query ? `proofs/purchases/${invoiceId}?${query}` : `proofs/purchases/${invoiceId}`);
}

/**
 * @param {string} invoiceId
 * @param {{ exp?: unknown; sig?: unknown }} [link]
 * @param {{ address: string; signature: string }} body
 */
/**
 * @param {string} invoiceId
 * @param {{ exp?: unknown; sig?: unknown }} [link]
 * @param {{ session: string; address: string }} body
 */
export function resumePurchaseProofPortal(invoiceId, link = {}, body) {
  const qs = new URLSearchParams();
  if (link.exp != null && String(link.exp) !== "") qs.set("exp", String(link.exp));
  if (typeof link.sig === "string" && link.sig.trim() !== "") qs.set("sig", link.sig.trim());
  const query = qs.toString();
  return tenantRequest(
    "POST",
    query ? `proofs/purchases/${invoiceId}/resume?${query}` : `proofs/purchases/${invoiceId}/resume`,
    { session: body.session, address: body.address },
  );
}

export function unlockPurchaseProofPortal(invoiceId, link = {}, body) {
  const qs = new URLSearchParams();
  if (link.exp != null && String(link.exp) !== "") qs.set("exp", String(link.exp));
  if (typeof link.sig === "string" && link.sig.trim() !== "") qs.set("sig", link.sig.trim());
  const query = qs.toString();
  return tenantRequest(
    "POST",
    query ? `proofs/purchases/${invoiceId}/unlock?${query}` : `proofs/purchases/${invoiceId}/unlock`,
    { address: body.address, signature: body.signature },
  );
}

export function fetchVendorInvoiceHistoryChallenge() {
  return tenantRequest("GET", "proofs/purchases/history");
}

/**
 * @param {{ address: string; signature: string; nonce: string }} body
 */
export function unlockVendorInvoiceHistory(body) {
  return tenantRequest("POST", "proofs/purchases/history", body);
}
