import { centralRequest } from "@/lib/axios";

export const PLATFORM_EMAIL_QUERY_KEY = /** @type {const} */ (["central", "platform-email"]);
export const PLATFORM_EMAIL_TEMPLATES_QUERY_KEY = /** @type {const} */ (["central", "platform-email", "templates"]);

/** Platform email types central can edit the text of. */
export const PLATFORM_EMAIL_TYPES = ["password_reset"];

/** @returns {Promise<Record<string, any>>} the platform mailbox (password never returned) */
export function fetchPlatformEmail() {
  return centralRequest("GET", "platform-email");
}

/** @param {Record<string, unknown>} values */
export function updatePlatformEmail(values) {
  return centralRequest("PUT", "platform-email", values);
}

/** @param {string | null} [to] default: the signed-in admin */
export function sendPlatformTestEmail(to = null) {
  return centralRequest("POST", "platform-email/test", to ? { to } : {});
}

/** @returns {Promise<{ templates: Record<string, any>[], placeholders: string[] }>} */
export async function fetchPlatformEmailTemplates() {
  const data = await centralRequest("GET", "platform-email/templates");
  return {
    templates: Array.isArray(data?.templates) ? data.templates : [],
    placeholders: Array.isArray(data?.placeholders) ? data.placeholders : [],
  };
}

/**
 * @param {string} type
 * @param {string} locale
 * @param {{ subject: string, body: string }} body
 */
export function savePlatformEmailTemplate(type, locale, body) {
  return centralRequest("PUT", `platform-email/templates/${type}/${locale}`, body);
}

/**
 * @param {string} type
 * @param {string} locale
 */
export function resetPlatformEmailTemplate(type, locale) {
  return centralRequest("DELETE", `platform-email/templates/${type}/${locale}`);
}
