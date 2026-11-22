import { tenantRequest } from "@/lib/axios";
import { fetchPaginatedResource } from "@/lib/tables/paginatedList";

/** @param {Record<string, string | number | boolean | undefined>} [params] */
export function fetchRecurringTemplates(params = {}) {
  return fetchPaginatedResource("recurring-templates", params);
}

/** @param {string} id */
export function fetchRecurringTemplate(id) {
  return tenantRequest("GET", `recurring-templates/${id}`);
}

/** @param {Record<string, unknown>} body */
export function createRecurringTemplate(body) {
  return tenantRequest("POST", "recurring-templates", body);
}

/** @param {string} id @param {Record<string, unknown>} body */
export function updateRecurringTemplate(id, body) {
  return tenantRequest("PUT", `recurring-templates/${id}`, body);
}

/** @param {string} id */
export function deleteRecurringTemplate(id) {
  return tenantRequest("DELETE", `recurring-templates/${id}`);
}

/** @param {string} id @param {number} [count] */
export function previewRecurringTemplate(id, count = 12) {
  return tenantRequest("GET", `recurring-templates/${id}/preview?count=${count}`);
}

/** @param {Record<string, unknown>} body @param {number} [count] */
export function previewRecurringTemplateDraft(body, count = 12) {
  return tenantRequest("POST", `recurring-templates/preview?count=${count}`, body);
}

/** @param {string} id @param {Record<string, unknown>} [body] */
export function runRecurringTemplate(id, body = {}) {
  return tenantRequest("POST", `recurring-templates/${id}/run`, body);
}

/** @param {string} id */
export function pauseRecurringTemplate(id) {
  return tenantRequest("POST", `recurring-templates/${id}/pause`);
}

/** @param {string} id @param {{ catch_up?: boolean }} [body] */
export function resumeRecurringTemplate(id, body = {}) {
  return tenantRequest("POST", `recurring-templates/${id}/resume`, body);
}

/** @param {string} id */
export function skipRecurringTemplate(id) {
  return tenantRequest("POST", `recurring-templates/${id}/skip`);
}

/** @param {string} id */
export function cancelRecurringTemplate(id) {
  return tenantRequest("POST", `recurring-templates/${id}/cancel`);
}
