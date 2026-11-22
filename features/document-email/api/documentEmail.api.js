import { tenantRequest } from "@/lib/axios";

export const EMAIL_SETTINGS_QUERY_KEY = /** @type {const} */ (["tenant", "email-settings"]);
export const EMAIL_TEMPLATES_QUERY_KEY = /** @type {const} */ (["tenant", "email-templates"]);

/**
 * @param {string} type
 * @param {string} id
 */
export const documentEmailsQueryKey = (type, id) => ["tenant", "document-emails", type, String(id)];

/**
 * Document types that can be emailed (same keys as the backend DocumentEmailRegistry).
 * @typedef {"sales_quotation" | "sales_order" | "sales_invoice" | "delivery_note" | "sales_credit_note" | "customer_receipt" | "customer_refund" | "purchase_order" | "purchase_debit_note" | "supplier_payment" | "customer_statement" | "supplier_statement"} DocumentEmailType
 */

/** @type {DocumentEmailType[]} */
export const DOCUMENT_EMAIL_TYPES = [
  "sales_invoice",
  "sales_quotation",
  "sales_order",
  "delivery_note",
  "sales_credit_note",
  "customer_receipt",
  "customer_refund",
  "customer_statement",
  "purchase_order",
  "purchase_debit_note",
  "supplier_payment",
  "supplier_statement",
];

/** @returns {Promise<Record<string, any>>} */
export async function fetchEmailSettings() {
  const data = await tenantRequest("GET", "email-settings");
  return data && typeof data === "object" ? data : {};
}

/** @param {Record<string, unknown>} values */
export function updateEmailSettings(values) {
  return tenantRequest("PUT", "email-settings", values);
}

/** Sends a test email with the saved settings (default recipient: the signed-in user). @param {string | null} [to] */
export function sendTestEmail(to = null) {
  return tenantRequest("POST", "email-settings/test", to ? { to } : {});
}

/** @returns {Promise<{ templates: Record<string, any>[]; placeholders: string[] }>} */
export async function fetchEmailTemplates() {
  const data = await tenantRequest("GET", "email-templates");
  return {
    templates: Array.isArray(data?.templates) ? data.templates : [],
    placeholders: Array.isArray(data?.placeholders) ? data.placeholders : [],
  };
}

/** @param {string} type @param {string} locale @param {{ subject: string; body: string }} body */
export function saveEmailTemplate(type, locale, body) {
  return tenantRequest("PUT", `email-templates/${type}/${locale}`, body);
}

/** @param {string} type @param {string} locale */
export function resetEmailTemplate(type, locale) {
  return tenantRequest("DELETE", `email-templates/${type}/${locale}`);
}

/** @param {Record<string, string | number | null | undefined>} params */
function query(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "") search.set(key, String(value));
  });
  return search.toString();
}

/**
 * Prefill for the send dialog: recipients, subject, body, attachment name and earlier sends.
 * @param {{ type: string; id: string; locale: string; date_from?: string | null; date_to?: string | null; currency_id?: number | null }} params
 */
export function fetchDocumentEmailDefaults(params) {
  return tenantRequest("GET", `document-emails/defaults?${query(params)}`);
}

/** @param {string} type @param {string} id @returns {Promise<Record<string, any>[]>} */
export async function fetchDocumentEmails(type, id) {
  const data = await tenantRequest("GET", `document-emails?${query({ type, id })}`);
  return Array.isArray(data?.emails) ? data.emails : [];
}

/** Queues the email; the result has status "queued". @param {Record<string, unknown>} body */
export function sendDocumentEmail(body) {
  return tenantRequest("POST", "document-emails", body);
}

/**
 * Whether a document kind can be emailed (e.g. supplier refunds share drawers with payments but are not sent).
 * @param {unknown} key
 * @returns {key is DocumentEmailType}
 */
export function isEmailableType(key) {
  return DOCUMENT_EMAIL_TYPES.includes(/** @type {any} */ (key));
}
